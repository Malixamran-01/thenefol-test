/**
 * Unified Meta config: env-first token, status, long-lived exchange, DB mirror.
 */
import { Request, Response } from 'express'
import { Pool } from 'pg'
import {
  getMetaAdAccountIdFromEnv,
  getMetaAdsAppId,
  getMetaAdsPixelId,
  getMetaFbPageIdFromEnv,
  getMetaPageAccessTokenFromEnv,
  getMetaUnifiedAccessTokenFromEnv,
  isMetaEnvOnlyMode,
} from '../config/metaAdsEnv'
import { sendError, sendSuccess } from '../utils/apiHelpers'
import { getMetaGraphAccessToken } from '../utils/metaAccessToken'
import { ensureTables } from './metaAds'
import {
  debugMetaAccessToken,
  exchangeShortLivedToLongLived,
  logMetaTokenExpiry,
} from '../services/metaTokenService'

/** GET /api/admin/meta/config/status — token validity, scopes, expiry (no raw token). */
export async function getMetaUnifiedStatus(pool: Pool, _req: Request, res: Response) {
  try {
    const token = await getMetaGraphAccessToken(pool)
    const payload: Record<string, unknown> = {
      meta_app_id: getMetaAdsAppId() || null,
      meta_ad_account_id: getMetaAdAccountIdFromEnv() || null,
      meta_fb_page_id: getMetaFbPageIdFromEnv() || null,
      meta_use_env_only: isMetaEnvOnlyMode(),
      env_token_set: !!getMetaUnifiedAccessTokenFromEnv(),
      page_access_token_set: !!getMetaPageAccessTokenFromEnv(),
      token_resolved: !!token,
      token_source_hint: getMetaUnifiedAccessTokenFromEnv()
        ? 'env'
        : 'database_or_legacy',
    }

    if (!token) {
      return sendSuccess(res, { ...payload, debug: null })
    }

    let debug: any = null
    try {
      debug = await debugMetaAccessToken(token)
    } catch (e: any) {
      debug = { error: e.message }
    }

    const d = debug?.data
    payload.debug = {
      is_valid: d?.is_valid ?? null,
      expires_at: d?.expires_at ? new Date(d.expires_at * 1000).toISOString() : null,
      scopes: d?.scopes ?? null,
      granular_scopes: d?.granular_scopes ?? null,
      user_id: d?.user_id ?? null,
      app_id: d?.app_id ?? null,
    }

    return sendSuccess(res, payload)
  } catch (err: any) {
    sendError(res, 500, err.message || 'Status failed', err)
  }
}

/**
 * POST /api/admin/meta/token/exchange
 * Body: { "short_lived_token": "..." }
 * Returns long-lived token once + saves to meta_ads_config (mirror) so DB-backed flows work.
 */
export async function postMetaTokenExchange(pool: Pool, req: Request, res: Response) {
  try {
    const shortLived = typeof req.body?.short_lived_token === 'string' ? req.body.short_lived_token.trim() : ''
    if (!shortLived) {
      return sendError(res, 400, 'short_lived_token is required (from Graph API Explorer or Facebook Login)')
    }

    const out = await exchangeShortLivedToLongLived(shortLived)
    await ensureTables(pool)

    const adId = getMetaAdAccountIdFromEnv() || null
    const pixel = getMetaAdsPixelId() || null

    await pool.query('DELETE FROM meta_ads_config')
    await pool.query(
      `INSERT INTO meta_ads_config (ad_account_id, pixel_id, access_token, updated_at)
       VALUES ($1, $2, $3, NOW())`,
      [adId, pixel, out.access_token]
    )

    if (adId) {
      await pool.query(
        `
        INSERT INTO facebook_field_mapping (key, value, updated_at)
        VALUES ('ad_account_id', $1, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `,
        [adId]
      )
    }

    sendSuccess(res, {
      success: true,
      expires_in: out.expires_in,
      message:
        'Long-lived token saved to database. For a single source of truth, set META_GRAPH_ACCESS_TOKEN in .env to this value and restart the server. Meta cannot auto-refresh long-lived tokens without a new short-lived token (~every 60 days).',
      access_token: out.access_token,
    })
  } catch (err: any) {
    sendError(res, 400, err.message || 'Exchange failed', err)
  }
}

/** Called from cron — no HTTP. */
export async function runMetaTokenHealthCheck(pool: Pool): Promise<void> {
  const token = await getMetaGraphAccessToken(pool)
  if (!token) {
    console.warn('[Meta] META_GRAPH_ACCESS_TOKEN / meta_ads_config: no token configured')
    return
  }
  await logMetaTokenExpiry(token)
}
