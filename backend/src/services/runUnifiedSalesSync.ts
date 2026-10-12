import { Pool } from 'pg'
import { syncWebsiteSales } from './syncWebsiteSales'
import { syncAmazonInvoicingReports } from './amazonInvoicingReportSync'
import { syncAmazonUnifiedSales } from './amazonSpApiSync'
import { syncFlipkartUnifiedSales } from './flipkartSellerSync'
import { setLastSyncCursor } from './unifiedSalesCursor'

/** Avoid spamming logs every hour when a marketplace API is down (same message ≤1/hour per platform). */
const MARKETPLACE_WARN_COOLDOWN_MS = 60 * 60 * 1000
const lastMarketplaceWarnAt: Partial<Record<'website' | 'amazon' | 'flipkart', number>> = {}

/** pg_advisory_lock key shared by every process/instance running the unified sales sync. */
const UNIFIED_SALES_LOCK_KEY = 74_201_001

function warnPlatformFailure(platform: 'website' | 'amazon' | 'flipkart', msg: string) {
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
  rowsSynced: number,
  startedAt: Date
) {
  await pool.query(
    `insert into sales_sync_logs (platform, status, message, rows_synced, started_at, finished_at)
     values ($1, $2, $3, $4, $5, now())`,
    [platform, status, sanitizeSyncMessage(message), rowsSynced, startedAt]
  )
}

export type SyncPlatform = 'website' | 'amazon' | 'flipkart'

export type UnifiedSyncOutcome = {
  /** true when another sync held the lock — nothing ran */
  busy?: boolean
  website?: { rows: number; error?: string }
  amazon?: {
    rows: number
    skipped?: boolean
    logMessage?: string
    error?: string
    invoicingReport?: { rowsUpdated: number; skipped?: boolean; logMessage?: string; detail?: string[] }
  }
  flipkart?: { rows: number; skipped?: boolean; logMessage?: string; error?: string }
}

/**
 * Runs the requested platform syncs one after another under a Postgres advisory lock, so the hourly cron,
 * the "Sync now" button and the Flipkart import endpoint can never overlap (a full Amazon backfill can take
 * longer than an hour). Each platform's cursor only advances when that platform succeeded.
 *
 * `force` (manual sync) also forces the Amazon GST MTR report, which otherwise runs every few hours.
 */
export async function runUnifiedSalesSync(
  pool: Pool,
  platforms: SyncPlatform[],
  opts: { force?: boolean } = {}
): Promise<UnifiedSyncOutcome> {
  const lockClient = await pool.connect()
  let locked = false
  try {
    const { rows } = await lockClient.query<{ ok: boolean }>('select pg_try_advisory_lock($1) as ok', [
      UNIFIED_SALES_LOCK_KEY,
    ])
    locked = rows[0]?.ok === true
    if (!locked) return { busy: true }
    return await runLocked(pool, platforms, opts)
  } finally {
    if (locked) {
      await lockClient.query('select pg_advisory_unlock($1)', [UNIFIED_SALES_LOCK_KEY]).catch(() => {})
    }
    lockClient.release()
  }
}

async function runLocked(pool: Pool, platforms: SyncPlatform[], opts: { force?: boolean }): Promise<UnifiedSyncOutcome> {
  const out: UnifiedSyncOutcome = {}

  if (platforms.includes('website')) {
    const startedAt = new Date()
    try {
      const r = await syncWebsiteSales(pool)
      out.website = r
      await insertLog(pool, 'website', 'success', null, r.rows, startedAt)
      await setLastSyncCursor(pool, 'website', startedAt)
    } catch (e: any) {
      // Don't let a website problem block the marketplace imports
      const msg = e?.message || String(e)
      await insertLog(pool, 'website', 'error', msg, 0, startedAt)
      out.website = { rows: 0, error: msg }
      warnPlatformFailure('website', msg)
    }
  }

  if (platforms.includes('amazon')) {
    const startedAt = new Date()
    try {
      const r = await syncAmazonUnifiedSales(pool)
      let inv: Awaited<ReturnType<typeof syncAmazonInvoicingReports>> | null = null
      if (!r.skipped) {
        await setLastSyncCursor(pool, 'amazon', startedAt)
        try {
          inv = await syncAmazonInvoicingReports(pool, { force: opts.force })
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
        ? [inv.logMessage, (inv.detail || []).join(' · ')].filter(Boolean).join(' — ').slice(0, 420)
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
        r.rows,
        startedAt
      )
    } catch (e: any) {
      const msg = e?.message || String(e)
      await insertLog(pool, 'amazon', 'error', msg, 0, startedAt)
      out.amazon = { rows: 0, error: msg }
      warnPlatformFailure('amazon', msg)
    }
  }

  if (platforms.includes('flipkart')) {
    const startedAt = new Date()
    try {
      const r = await syncFlipkartUnifiedSales(pool)
      out.flipkart = r
      if (!r.skipped) await setLastSyncCursor(pool, 'flipkart', startedAt)
      await insertLog(
        pool,
        'flipkart',
        r.skipped ? 'skipped' : 'success',
        r.skipped ? r.logMessage || 'Flipkart API not configured' : r.logMessage || null,
        r.rows,
        startedAt
      )
    } catch (e: any) {
      const msg = e?.message || String(e)
      await insertLog(pool, 'flipkart', 'error', msg, 0, startedAt)
      out.flipkart = { rows: 0, error: msg }
      warnPlatformFailure('flipkart', msg)
    }
  }

  return out
}

export async function runHourlyUnifiedSalesSync(pool: Pool) {
  const r = await runUnifiedSalesSync(pool, ['website', 'amazon', 'flipkart'])
  if (r.busy) console.log('[unified-sales] previous sync still running — skipping this hour')
}
