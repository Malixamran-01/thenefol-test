// Product GST rates for the storefront, and admin management of scheduled GST changes
// (created from admin Products → Bulk edit; see routes/productBulk.ts).
import { Request, Response } from 'express'
import { Pool } from 'pg'
import { getStaffContext, sendError, sendSuccess } from '../utils/apiHelpers'
import { getProductGstRates } from '../services/productGst'

const MAX_IDS = 200

/**
 * GET /api/gst/rates?ids=1,2,3 (public)
 * → { rates: { [productId]: { rate, isDefault, upcoming } } } — the rate in force now for each
 * product, plus the next scheduled change so the cart can refresh the moment it takes effect.
 */
export async function getGstRates(pool: Pool, req: Request, res: Response) {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, MAX_IDS)
    const map = await getProductGstRates(pool, ids)
    const rates: Record<string, unknown> = {}
    for (const [id, info] of map) rates[String(id)] = info
    res.setHeader('Cache-Control', 'no-store')
    sendSuccess(res, { rates, serverTime: new Date().toISOString() })
  } catch (err) {
    sendError(res, 500, 'Failed to load GST rates', err)
  }
}

/** GET /api/admin/gst-schedules?status=pending|all */
export async function adminListGstSchedules(pool: Pool, req: Request, res: Response) {
  try {
    const all = req.query.status === 'all'
    const { rows } = await pool.query(
      `SELECT s.id, s.product_id, p.title AS product_title, p.slug AS product_slug,
              s.gst_rate::float AS gst_rate, s.previous_rate::float AS previous_rate,
              NULLIF(COALESCE(p.details->>'gst', p.details->>'gstPercent', p.details->>'GST %'), '') AS current_rate,
              s.effective_at, s.status, s.batch_id, s.created_by_name, s.created_at,
              s.applied_at, s.cancelled_at, s.cancelled_by_name
         FROM product_gst_schedules s
         JOIN products p ON p.id = s.product_id
        WHERE ${all ? 'TRUE' : `s.status = 'pending'`}
        ORDER BY ${all ? 's.created_at DESC' : 's.effective_at ASC, p.title ASC'}
        LIMIT 1000`
    )
    sendSuccess(res, { schedules: rows })
  } catch (err) {
    sendError(res, 500, 'Failed to load scheduled GST changes', err)
  }
}

/** POST /api/admin/gst-schedules/cancel { ids: number[] } — cancels pending changes only */
export async function adminCancelGstSchedules(pool: Pool, req: Request, res: Response) {
  try {
    const ids: number[] = Array.isArray(req.body?.ids)
      ? [...new Set<number>(req.body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0))]
      : []
    if (!ids.length) return sendError(res, 400, 'Choose at least one scheduled change')
    const staffId = getStaffContext(req)?.staffId
    let staffName: string | null = null
    if (staffId) {
      const r = await pool.query('SELECT name, email FROM staff_users WHERE id = $1', [staffId]).catch(() => ({ rows: [] as any[] }))
      staffName = r.rows[0]?.name || r.rows[0]?.email || null
    }
    // effective_at > NOW(): a change whose moment has passed is already live and can't be cancelled
    const { rows } = await pool.query(
      `UPDATE product_gst_schedules
          SET status = 'cancelled', cancelled_at = NOW(), cancelled_by_name = $2
        WHERE id = ANY($1::int[]) AND status = 'pending' AND effective_at > NOW()
        RETURNING id`,
      [ids, staffName]
    )
    sendSuccess(res, { cancelled: rows.length, skipped: ids.length - rows.length })
  } catch (err) {
    sendError(res, 500, 'Failed to cancel scheduled GST changes', err)
  }
}
