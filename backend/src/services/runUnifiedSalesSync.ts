import { Pool } from 'pg'
import { syncWebsiteSales } from './syncWebsiteSales'
import { syncAmazonUnifiedSales } from './amazonSpApiSync'
import { syncFlipkartUnifiedSales } from './flipkartSellerSync'

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
    [platform, status, message, rowsSynced]
  )
}

export type SyncPlatform = 'website' | 'amazon' | 'flipkart'

export async function runUnifiedSalesSync(pool: Pool, platforms: SyncPlatform[]): Promise<{
  website?: { rows: number }
  amazon?: { rows: number; skipped?: boolean }
  flipkart?: { rows: number; skipped?: boolean }
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
      out.amazon = r
      await insertLog(
        pool,
        'amazon',
        r.skipped ? 'skipped' : 'success',
        r.skipped ? r.logMessage || 'SP-API not configured' : r.logMessage || null,
        r.rows
      )
    } catch (e: any) {
      await insertLog(pool, 'amazon', 'error', e?.message || String(e), 0)
      throw e
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
        r.skipped ? 'Flipkart API not configured' : r.logMessage || null,
        r.rows
      )
    } catch (e: any) {
      await insertLog(pool, 'flipkart', 'error', e?.message || String(e), 0)
      throw e
    }
  }

  return out
}

export async function runHourlyUnifiedSalesSync(pool: Pool) {
  await runUnifiedSalesSync(pool, ['website', 'amazon', 'flipkart'])
}
