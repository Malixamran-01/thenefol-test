import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'
import { syncFlipkartUnifiedSales } from '../services/flipkartSellerSync'

export async function saveFlipkartAccount(pool: Pool, req: Request, res: Response) {
  try {
    const { name, credentials } = req.body || {}
    const validationError = validateRequired({ name, credentials }, ['name', 'credentials'])
    if (validationError) return sendError(res, 400, validationError)
    const { rows } = await pool.query(
      `insert into marketplace_accounts (channel, name, credentials, is_active, created_at, updated_at)
       values ('flipkart', $1, $2::jsonb, true, now(), now())
       on conflict (channel, name) do update set credentials = excluded.credentials, updated_at = now()
       returning *`,
      [name, JSON.stringify(credentials)]
    )
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to save Flipkart account', err)
  }
}

export async function listFlipkartAccounts(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(`select * from marketplace_accounts where channel = 'flipkart' order by created_at desc`)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list Flipkart accounts', err)
  }
}

export async function syncProductsToFlipkart(pool: Pool, req: Request, res: Response) {
  try {
    const { accountId, productId } = req.body || {}
    const validationError = validateRequired({ accountId }, ['accountId'])
    if (validationError) return sendError(res, 400, validationError)
    if (productId) {
      await pool.query(
        `insert into channel_listings (channel, account_id, product_id, status, created_at, updated_at)
         values ('flipkart', $1, $2, 'pending', now(), now())
         on conflict do nothing`,
        [accountId, productId]
      )
    }
    sendSuccess(res, { message: 'Product sync queued (stub)' })
  } catch (err) {
    sendError(res, 500, 'Failed to sync products to Flipkart', err)
  }
}

/**
 * Runs the same unified-sales Flipkart import as the hourly job (env credentials).
 * `accountId` is optional (legacy); unified sync does not filter by account yet.
 */
export async function importFlipkartOrders(pool: Pool, req: Request, res: Response) {
  try {
    // query.accountId reserved for future per-account routing; unified sync uses FLIPKART_* env
    const result = await syncFlipkartUnifiedSales(pool)
    if (result.skipped) {
      return sendSuccess(res, {
        ok: true,
        skipped: true,
        rows: result.rows,
        logMessage: result.logMessage || 'Flipkart API not configured or unified sync disabled',
      })
    }
    sendSuccess(res, {
      ok: true,
      skipped: false,
      rows: result.rows,
      logMessage: result.logMessage || null,
      message: `Imported ${result.rows} line(s) into unified_sales`,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Flipkart] importFlipkartOrders / syncFlipkartUnifiedSales:', err)
    sendError(res, 500, msg || 'Failed to run Flipkart unified import', err)
  }
}


