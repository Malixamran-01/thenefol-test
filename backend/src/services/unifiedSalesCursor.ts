import { Pool } from 'pg'

/** Overlap before the last cursor so late API updates / clock skew still land (upsert dedupes). */
export const UNIFIED_SALES_INCREMENTAL_OVERLAP_MS = 2 * 60 * 60 * 1000 // 2 hours

export async function getMaxUnifiedOrderDate(pool: Pool, platform: string): Promise<Date | null> {
  const { rows } = await pool.query<{ m: Date | null }>(
    `select max(order_date) as m from unified_sales where platform = $1`,
    [platform]
  )
  const m = rows[0]?.m
  return m ? new Date(m) : null
}

/**
 * When the last successful sync for `platform` STARTED. Incremental syncs ask the source for records
 * changed since this time (minus overlap) instead of records created after the newest stored order —
 * otherwise status changes (shipped → cancelled, pending → priced) on older orders are never picked up.
 */
export async function getLastSyncCursor(pool: Pool, platform: string): Promise<Date | null> {
  const { rows } = await pool.query<{ last_success_at: Date }>(
    `select last_success_at from sales_sync_state where platform = $1`,
    [platform]
  )
  return rows[0]?.last_success_at ? new Date(rows[0].last_success_at) : null
}

export async function setLastSyncCursor(pool: Pool, platform: string, startedAt: Date): Promise<void> {
  await pool.query(
    `insert into sales_sync_state (platform, last_success_at) values ($1, $2)
     on conflict (platform) do update set last_success_at = excluded.last_success_at`,
    [platform, startedAt]
  )
}
