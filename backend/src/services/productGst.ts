/**
 * Per-product GST: rate lookup (including scheduled changes), server-side order GST, and the
 * job that copies due scheduled changes into the product.
 *
 * - A product's own rate lives in products.details.gst (admin product form / GST endpoints).
 * - product_gst_schedules holds future changes made from admin bulk edit. The rate lookup
 *   honours a pending change from its effective moment, so it is live exactly at e.g. 12:00 AM
 *   IST even if the once-a-minute job that writes it into the product runs a little later.
 * - Website prices are GST-inclusive; see gstCalc.ts.
 */
import { Pool, PoolClient } from 'pg'
import {
  DEFAULT_GST_RATE,
  computeGst,
  effectiveGstRate,
  nextGstChange,
  parseGstRate,
  productGstRate,
  type GstScheduleLike,
  type GstSummary,
} from './gstCalc'
import { lineQty, normalizeOrderItems } from './inventoryBatchService'

type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>

/** Same DDL as migrate.js step 21; also run from ensureSchema() on startup. */
export const GST_SCHEDULE_DDL = `
  CREATE TABLE IF NOT EXISTS product_gst_schedules (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    gst_rate NUMERIC(5,2) NOT NULL CHECK (gst_rate >= 0 AND gst_rate <= 100),
    effective_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled')),
    previous_rate NUMERIC(5,2),
    batch_id TEXT,
    created_by INTEGER,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by_name TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_product_gst_schedules_pending
    ON product_gst_schedules (product_id, effective_at) WHERE status = 'pending';
  CREATE INDEX IF NOT EXISTS idx_product_gst_schedules_due
    ON product_gst_schedules (effective_at) WHERE status = 'pending';
`

export async function ensureGstScheduleTable(pool: Queryable) {
  await pool.query(GST_SCHEDULE_DDL)
}

export type ProductGstInfo = {
  /** Rate in force now (scheduled change included), DEFAULT_GST_RATE when the product has none */
  rate: number
  /** The product's own rate is missing and the default is being used */
  isDefault: boolean
  upcoming: { rate: number; effective_at: string } | null
}

/** Rates for the given product ids at `at`. Unknown ids are left out. */
export async function getProductGstRates(
  db: Queryable,
  productIds: number[],
  at: Date = new Date()
): Promise<Map<number, ProductGstInfo>> {
  const ids = [...new Set(productIds.filter((n) => Number.isInteger(n) && n > 0))]
  const out = new Map<number, ProductGstInfo>()
  if (!ids.length) return out

  const [{ rows: products }, schedules] = await Promise.all([
    db.query('SELECT id, details FROM products WHERE id = ANY($1::int[])', [ids]),
    db
      .query(
        `SELECT id, product_id, gst_rate AS rate, effective_at, status
           FROM product_gst_schedules WHERE product_id = ANY($1::int[]) AND status = 'pending'`,
        [ids]
      )
      .then((r: any) => r.rows as Array<GstScheduleLike & { product_id: number }>)
      // Table missing (migration not run yet): behave as if nothing is scheduled
      .catch((err: any) => {
        if (err?.code === '42P01') return []
        throw err
      }),
  ])

  const byProduct = new Map<number, GstScheduleLike[]>()
  for (const s of schedules) {
    const list = byProduct.get(Number(s.product_id)) || []
    list.push(s)
    byProduct.set(Number(s.product_id), list)
  }

  for (const p of products as Array<{ id: number; details: unknown }>) {
    const own = productGstRate(p.details)
    const list = byProduct.get(Number(p.id)) || []
    const rate = effectiveGstRate(own, list, at)
    const next = nextGstChange(list, at)
    out.set(Number(p.id), {
      rate: rate ?? DEFAULT_GST_RATE,
      isDefault: rate == null,
      upcoming: next
        ? { rate: parseGstRate(next.rate)!, effective_at: new Date(next.effective_at).toISOString() }
        : null,
    })
  }
  return out
}

/** product id for an order line: product_id / id, else looked up by slug. */
async function resolveLineProductIds(db: Queryable, lines: any[]): Promise<Array<number | null>> {
  const ids: Array<number | null> = lines.map((l) => {
    const n = Number(l?.product_id ?? l?.id)
    return Number.isInteger(n) && n > 0 ? n : null
  })
  const slugs = lines
    .map((l, i) => (ids[i] == null && typeof l?.slug === 'string' && l.slug.trim() ? l.slug.trim() : null))
    .filter((s): s is string => !!s)
  if (slugs.length) {
    const { rows } = await db.query('SELECT id, slug FROM products WHERE slug = ANY($1::text[])', [slugs])
    const bySlug = new Map<string, number>(rows.map((r: any) => [String(r.slug), Number(r.id)]))
    lines.forEach((l, i) => {
      if (ids[i] == null && typeof l?.slug === 'string') ids[i] = bySlug.get(l.slug.trim()) ?? null
    })
  }
  return ids
}

const parseMoney = (v: unknown): number => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Server-side GST for an order: each line at its product's rate in force now, on the line's
 * GST-inclusive price × quantity. Returns the items with the rate and amounts stamped on them
 * (gst_rate, gst_amount, taxable_value) so invoices stay correct after a rate changes later.
 * Client-sent tax figures are ignored.
 */
export async function priceOrderGst(
  db: Queryable,
  rawItems: unknown,
  at: Date = new Date()
): Promise<{ items: any[]; summary: GstSummary }> {
  const lines = normalizeOrderItems(rawItems)
  const productIds = await resolveLineProductIds(db, lines)
  const rates = await getProductGstRates(db, productIds.filter((n): n is number => n != null), at)

  const inputs = lines.map((line, i) => {
    const pid = productIds[i]
    const rate = (pid != null ? rates.get(pid)?.rate : undefined) ?? DEFAULT_GST_RATE
    return { unitPrice: parseMoney(line?.price ?? line?.unitPrice), quantity: lineQty(line), rate }
  })
  const summary = computeGst(inputs)

  const items = lines.map((line, i) => {
    const l = summary.lines[i]
    const stamped: any = { ...line, gst_rate: l.rate, gst_amount: l.gst, taxable_value: l.taxable }
    // Older readers (invoice fallbacks, website sales sync) look at csvProduct['GST %']
    if (line?.csvProduct && typeof line.csvProduct === 'object') {
      stamped.csvProduct = { ...line.csvProduct, 'GST %': String(l.rate) }
    }
    return stamped
  })
  return { items, summary }
}

/**
 * Copy pending changes whose time has come into products.details and mark them applied.
 * Safe to run concurrently (row locks + SKIP LOCKED). Returns the number of products updated.
 */
export async function applyDueGstSchedules(pool: Pool, now: Date = new Date()): Promise<number> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: due } = await client.query(
      `SELECT id, product_id, gst_rate, effective_at FROM product_gst_schedules
        WHERE status = 'pending' AND effective_at <= $1
        ORDER BY product_id, effective_at, id
        FOR UPDATE SKIP LOCKED`,
      [now]
    )
    if (!due.length) {
      await client.query('COMMIT')
      return 0
    }
    // Latest due change per product wins; earlier ones were superseded
    const latest = new Map<number, any>()
    for (const r of due) latest.set(Number(r.product_id), r)

    for (const [productId, r] of latest) {
      const rate = String(Number(r.gst_rate))
      await client.query(
        `UPDATE products
            SET details = COALESCE(details, '{}'::jsonb) || jsonb_build_object('gst', $2::text, 'gstPercent', $2::text, 'GST %', $2::text),
                updated_at = NOW()
          WHERE id = $1`,
        [productId, rate]
      )
    }
    await client.query(
      `UPDATE product_gst_schedules SET status = 'applied', applied_at = NOW() WHERE id = ANY($1::int[])`,
      [due.map((r: any) => r.id)]
    )
    await client.query('COMMIT')
    return latest.size
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

/** Furthest ahead a change can be scheduled. */
const MAX_SCHEDULE_AHEAD_MS = 2 * 366 * 24 * 60 * 60 * 1000

/** Validate an admin-entered effective time. Returns a Date or an error message. */
export function parseEffectiveAt(value: unknown, now: Date = new Date()): Date | string {
  if (typeof value !== 'string' || !value.trim()) return 'Choose when the new GST rate takes effect'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return 'Invalid effective date'
  if (d.getTime() <= now.getTime()) return 'The effective time must be in the future (or apply the change now)'
  if (d.getTime() - now.getTime() > MAX_SCHEDULE_AHEAD_MS) return 'Changes can be scheduled at most two years ahead'
  return d
}

/**
 * Store scheduled changes for the given products. A pending change for the same product at the
 * same moment is replaced. Runs on the caller's transaction.
 */
export async function insertGstSchedules(
  client: Queryable,
  rows: Array<{ productId: number; previousRate: number | null }>,
  rate: number,
  effectiveAt: Date,
  staff: { id?: number | null; name?: string | null } = {},
  batchId: string | null = null
) {
  if (!rows.length) return
  const ids = rows.map((r) => r.productId)
  await client.query(
    `UPDATE product_gst_schedules
        SET status = 'cancelled', cancelled_at = NOW(), cancelled_by_name = $3
      WHERE status = 'pending' AND product_id = ANY($1::int[]) AND effective_at = $2`,
    [ids, effectiveAt, staff.name ? `${staff.name} (replaced)` : 'replaced']
  )
  await client.query(
    `INSERT INTO product_gst_schedules (product_id, gst_rate, effective_at, previous_rate, batch_id, created_by, created_by_name)
     SELECT p, $2, $3, prev, $4, $5, $6 FROM unnest($1::int[], $7::numeric[]) AS t(p, prev)`,
    [ids, rate, effectiveAt, batchId, staff.id ?? null, staff.name ?? null, rows.map((r) => r.previousRate)]
  )
}
