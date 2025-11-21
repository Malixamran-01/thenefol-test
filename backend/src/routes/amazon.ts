import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'

export async function saveAmazonAccount(pool: Pool, req: Request, res: Response) {
  try {
    const { name, credentials } = req.body || {}
    const validationError = validateRequired({ name, credentials }, ['name', 'credentials'])
    if (validationError) return sendError(res, 400, validationError)
    const { rows } = await pool.query(
      `insert into marketplace_accounts (channel, name, credentials, is_active, created_at, updated_at)
       values ('amazon', $1, $2::jsonb, true, now(), now())
       on conflict (channel, name) do update set credentials = excluded.credentials, updated_at = now()
       returning *`,
      [name, JSON.stringify(credentials)]
    )
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to save Amazon account', err)
  }
}

export async function listAmazonAccounts(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(`select * from marketplace_accounts where channel = 'amazon' order by created_at desc`)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list Amazon accounts', err)
  }
}

// Stubs for sync; implementation will require SP-API auth and feeds/orders APIs
export async function syncProductsToAmazon(pool: Pool, req: Request, res: Response) {
  try {
    const { accountId, productId } = req.body || {}
    const validationError = validateRequired({ accountId }, ['accountId'])
    if (validationError) return sendError(res, 400, validationError)
    // record listing intent
    if (productId) {
      await pool.query(
        `insert into channel_listings (channel, account_id, product_id, status, created_at, updated_at)
         values ('amazon', $1, $2, 'pending', now(), now())
         on conflict do nothing`,
        [accountId, productId]
      )
    }
    sendSuccess(res, { message: 'Product sync queued (stub)' })
  } catch (err) {
    sendError(res, 500, 'Failed to sync products to Amazon', err)
  }
}

export async function importAmazonOrders(pool: Pool, req: Request, res: Response) {
  try {
    const { accountId } = req.query as any
    if (!accountId) return sendError(res, 400, 'accountId is required')
    // stub: mark a channel_orders row
    await pool.query(
      `insert into channel_orders (channel, account_id, external_order_id, status, imported_at, updated_at)
       values ('amazon', $1, $2, 'imported', now(), now())
       on conflict (channel, external_order_id) do nothing`,
      [accountId, `AMZ-${Date.now()}`]
    )
    sendSuccess(res, { message: 'Order import triggered (stub)' })
  } catch (err) {
    sendError(res, 500, 'Failed to import Amazon orders', err)
  }
}


