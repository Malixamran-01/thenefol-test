import { Pool } from 'pg'

/** Overlap before last stored order so late API updates / clock skew still land (upsert dedupes). */
export const UNIFIED_SALES_INCREMENTAL_OVERLAP_MS = 2 * 60 * 60 * 1000 // 2 hours

export async function getMaxUnifiedOrderDate(pool: Pool, platform: string): Promise<Date | null> {
  const { rows } = await pool.query<{ m: Date | null }>(
    `select max(order_date) as m from unified_sales where platform = $1`,
    [platform]
  )
  const m = rows[0]?.m
  return m ? new Date(m) : null
}
