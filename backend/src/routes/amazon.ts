import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token'

/** Amazon redirects here with spapi_oauth_code after seller authorizes SP-API. */
export async function amazonOAuthCallback(pool: Pool, req: Request, res: Response) {
  try {
    const spapi_oauth_code = req.query.spapi_oauth_code as string | undefined
    const selling_partner_id = req.query.selling_partner_id as string | undefined
    const state = typeof req.query.state === 'string' ? req.query.state : undefined

    if (!spapi_oauth_code) {
      return sendError(res, 400, 'Missing spapi_oauth_code')
    }

    const clientId = process.env.AMAZON_LWA_CLIENT_ID
    const clientSecret = process.env.AMAZON_LWA_CLIENT_SECRET
    const redirectUri = process.env.AMAZON_OAUTH_REDIRECT_URI?.trim()

    if (!clientId || !clientSecret) {
      return sendError(res, 500, 'Amazon OAuth not configured (AMAZON_LWA_CLIENT_ID / AMAZON_LWA_CLIENT_SECRET)')
    }
    if (!redirectUri) {
      return sendError(
        res,
        500,
        'Set AMAZON_OAUTH_REDIRECT_URI to this deployment’s public callback URL (must match Amazon Developer Central exactly)'
      )
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: spapi_oauth_code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    })

    const tokenRes = await fetch(LWA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString(),
    })

    const tokenJson = (await tokenRes.json()) as Record<string, unknown>
    if (!tokenRes.ok) {
      const detail = tokenJson.error_description || tokenJson.error || JSON.stringify(tokenJson)
      return sendError(res, 400, `LWA token exchange failed: ${detail}`)
    }

    const refresh_token = tokenJson.refresh_token as string | undefined
    const access_token = tokenJson.access_token as string | undefined
    const expires_in = tokenJson.expires_in as number | undefined

    let accountUpdated = false
    if (state && refresh_token) {
      const accountName = decodeURIComponent(state)
      const { rows } = await pool.query<{ id: number; credentials: Record<string, unknown> }>(
        `select id, credentials from marketplace_accounts where channel = 'amazon' and name = $1`,
        [accountName]
      )
      if (rows.length) {
        const prev = rows[0].credentials || {}
        const creds = {
          ...prev,
          refresh_token,
          access_token,
          expires_in,
          selling_partner_id,
          spapi_oauth_connected_at: new Date().toISOString(),
        }
        await pool.query(`update marketplace_accounts set credentials = $1::jsonb, updated_at = now() where id = $2`, [
          JSON.stringify(creds),
          rows[0].id,
        ])
        accountUpdated = true
      }
    }

    const wantsJson = req.get('Accept')?.includes('application/json') || req.query.format === 'json'
    if (wantsJson) {
      return sendSuccess(res, {
        ok: true,
        accountUpdated,
        selling_partner_id: selling_partner_id || null,
        message: accountUpdated
          ? 'Tokens saved to marketplace account'
          : state
            ? 'No matching Amazon marketplace account for state; add credentials manually'
            : 'Tokens received; pass state=<account_name> on authorize URL to auto-save',
      })
    }

    res
      .status(200)
      .type('html')
      .send(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Amazon connected</title></head><body>` +
          `<p>Amazon SP-API authorization ${accountUpdated ? 'saved' : 'completed'}.</p>` +
          `<p>You can close this window.</p>` +
          `</body></html>`
      )
  } catch (err) {
    sendError(res, 500, 'Amazon OAuth callback failed', err)
  }
}

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


