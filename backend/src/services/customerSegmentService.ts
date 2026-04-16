import { Pool } from 'pg'

export type CustomerSegmentRule = {
  id: number
  name: string
  description: string | null
  min_lifetime_spend: number
  min_orders: number
  discount_percent: number
  /** When true, `discount_percent` applies at cart/checkout for users in this segment. */
  segment_discount_enabled: boolean
  tier_priority: number
  is_active: boolean
}

/** Load active segments: highest tier_priority first (VIP before welcome). */
export async function getActiveSegmentsOrdered(pool: Pool): Promise<CustomerSegmentRule[]> {
  const { rows } = await pool.query<CustomerSegmentRule>(
    `select id, name, description, min_lifetime_spend, min_orders, discount_percent,
            coalesce(segment_discount_enabled, false) as segment_discount_enabled,
            tier_priority, is_active
     from customer_segments
     where coalesce(is_active, true) = true
     order by tier_priority desc, id asc`
  )
  return rows
}

export async function getUserPurchaseStats(
  pool: Pool,
  userId: number
): Promise<{ total_spent: number; order_count: number }> {
  const { rows } = await pool.query(
    `select
       coalesce(sum(o.total), 0)::numeric as total_spent,
       count(o.id)::int as order_count
     from users u
     left join orders o on o.customer_email = u.email
       and coalesce(lower(o.status), '') not in ('cancelled', 'canceled', 'refunded', 'void')
     where u.id = $1
     group by u.id`,
    [userId]
  )
  if (rows.length === 0) return { total_spent: 0, order_count: 0 }
  return {
    total_spent: Number(rows[0].total_spent) || 0,
    order_count: Number(rows[0].order_count) || 0,
  }
}

/**
 * First matching segment wins (list is ordered by tier_priority desc).
 * User must satisfy BOTH min_lifetime_spend AND min_orders when those are > 0.
 */
export async function resolveBestSegmentForUser(
  pool: Pool,
  userId: number
): Promise<CustomerSegmentRule | null> {
  const stats = await getUserPurchaseStats(pool, userId)
  const segments = await getActiveSegmentsOrdered(pool)
  for (const seg of segments) {
    const minSpend = Number(seg.min_lifetime_spend) || 0
    const minOrd = Number(seg.min_orders) || 0
    if (stats.total_spent >= minSpend && stats.order_count >= minOrd) {
      return seg
    }
  }
  return null
}

export async function getSegmentDiscountPercentForUser(pool: Pool, userId: number): Promise<number> {
  const seg = await resolveBestSegmentForUser(pool, userId)
  if (!seg) return 0
  if (!seg.segment_discount_enabled) return 0
  const p = Number(seg.discount_percent)
  return Number.isFinite(p) && p > 0 ? Math.min(100, p) : 0
}

export function computeSegmentDiscountAmount(subtotal: number, discountPercent: number): number {
  if (subtotal <= 0 || discountPercent <= 0) return 0
  return Math.round((subtotal * discountPercent) / 100)
}
