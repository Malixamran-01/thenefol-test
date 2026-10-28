// Google reviews from the store's Google Business Profile (Business Profile API).
// An admin connects once with Google OAuth (business.manage scope). The refresh token is stored
// encrypted, and every review of the chosen location is synced into google_reviews (daily cron + "Sync now").
// Admins choose which reviews appear in the storefront's "Happy customers" section.
import crypto from 'crypto'
import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess } from '../utils/apiHelpers'
import { getAdminPanelOrigin } from '../config/superAdmin'

const SCOPES = ['https://www.googleapis.com/auth/business.manage', 'openid', 'email']
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const ACCOUNTS_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts'
const INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1'
const REVIEWS_BASE = 'https://mybusiness.googleapis.com/v4'
const STATE_TTL_MINUTES = 15
const PUBLIC_LIMIT = 24

type FetchLike = typeof fetch

// ---- config & secrets ------------------------------------------------------------------------

export function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || ''
  const backend = String(process.env.BACKEND_URL || 'http://localhost:2000').replace(/\/$/, '')
  const redirectUri = process.env.GOOGLE_BUSINESS_REDIRECT_URI || `${backend}/api/google-reviews/oauth/callback`
  const placeholder = (v: string) => !v || v.startsWith('your_')
  return { clientId, clientSecret, redirectUri, configured: !placeholder(clientId) && !placeholder(clientSecret) }
}

function encryptionKey(): Buffer | null {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || ''
  if (!secret || secret.startsWith('your_')) return null
  return crypto.createHash('sha256').update(secret).digest()
}

/** AES-256-GCM; output "v1:<iv>:<tag>:<ciphertext>" (base64 parts). */
export function encryptSecret(plain: string): string {
  const key = encryptionKey()
  if (!key) throw new Error('Set ENCRYPTION_KEY in the backend .env before connecting Google')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':')
}

export function decryptSecret(stored: string): string {
  const key = encryptionKey()
  const [v, iv, tag, data] = String(stored || '').split(':')
  if (!key || v !== 'v1' || !iv || !tag || !data) throw new Error('Stored Google token cannot be read; reconnect Google')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
}

// ---- review helpers --------------------------------------------------------------------------

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }
export const starRatingToNumber = (s: unknown) => STARS[String(s || '').toUpperCase()] || 0

/**
 * Google returns non-English reviews as "<translation>\n\n(Original)\n<original>" or
 * "<original>\n\n(Translated by Google)\n<translation>". Keep the customer's own words.
 */
export function cleanReviewComment(raw: unknown): string {
  let text = String(raw || '').trim()
  const original = text.match(/\(Original\)\s*([\s\S]+)$/)
  if (original) text = original[1]
  else text = text.split(/\(Translated by Google\)/)[0]
  return text.trim()
}

/** Shown on the storefront unless an admin decided otherwise: 4–5 stars with a written comment. */
export const defaultVisible = (rating: number, comment: string) => rating >= 4 && comment.trim().length >= 3

export type GoogleReview = {
  reviewId: string
  name?: string
  reviewer?: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean }
  starRating?: string
  comment?: string
  createTime?: string
  updateTime?: string
  reviewReply?: { comment?: string; updateTime?: string }
}

/** Every review of a location (follows nextPageToken), plus Google's average rating and total count. */
export async function fetchAllReviews(accessToken: string, reviewsPath: string, fetchImpl: FetchLike = fetch) {
  const reviews: GoogleReview[] = []
  let averageRating: number | null = null
  let totalReviewCount: number | null = null
  let pageToken = ''
  for (let page = 0; page < 200; page++) {
    const url = new URL(`${REVIEWS_BASE}/${reviewsPath}/reviews`)
    url.searchParams.set('pageSize', '50')
    url.searchParams.set('orderBy', 'updateTime desc')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const data = await googleGet(url.toString(), accessToken, fetchImpl)
    if (page === 0) {
      averageRating = typeof data.averageRating === 'number' ? data.averageRating : null
      totalReviewCount = typeof data.totalReviewCount === 'number' ? data.totalReviewCount : null
    }
    reviews.push(...(Array.isArray(data.reviews) ? data.reviews : []))
    pageToken = data.nextPageToken || ''
    if (!pageToken) return { reviews, averageRating, totalReviewCount, complete: true }
  }
  return { reviews, averageRating, totalReviewCount, complete: false }
}

async function googleGet(url: string, accessToken: string, fetchImpl: FetchLike = fetch): Promise<any> {
  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(20000) })
  const data: any = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`
    const hint = res.status === 403 || res.status === 429
      ? ' (has Google approved Business Profile API access for this project, and are the APIs enabled?)'
      : ''
    throw new Error(`Google API: ${msg}${hint}`)
  }
  return data
}

// ---- tables ----------------------------------------------------------------------------------

export async function ensureGoogleReviewTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS google_reviews_config (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      refresh_token_enc TEXT,
      connected_email TEXT,
      account_name TEXT,
      location_name TEXT,
      location_title TEXT,
      place_id TEXT,
      maps_uri TEXT,
      new_review_uri TEXT,
      average_rating NUMERIC(2,1),
      total_reviews INTEGER,
      last_sync_at TIMESTAMPTZ,
      last_error TEXT,
      oauth_state TEXT,
      oauth_state_expires TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO google_reviews_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    CREATE TABLE IF NOT EXISTS google_reviews (
      id SERIAL PRIMARY KEY,
      review_id TEXT UNIQUE NOT NULL,
      location_name TEXT NOT NULL,
      reviewer_name TEXT,
      reviewer_photo_url TEXT,
      is_anonymous BOOLEAN DEFAULT false,
      rating SMALLINT NOT NULL,
      comment TEXT,
      reply TEXT,
      review_created_at TIMESTAMPTZ,
      review_updated_at TIMESTAMPTZ,
      is_visible BOOLEAN NOT NULL DEFAULT false,
      is_featured BOOLEAN NOT NULL DEFAULT false,
      admin_override BOOLEAN NOT NULL DEFAULT false,
      synced_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_google_reviews_public ON google_reviews(location_name, is_visible, is_featured DESC, review_created_at DESC);
  `)
}

async function loadConfig(pool: Pool) {
  const { rows } = await pool.query('SELECT * FROM google_reviews_config WHERE id = 1')
  return rows[0] || {}
}

// ---- OAuth -----------------------------------------------------------------------------------

async function exchangeToken(params: Record<string, string>, fetchImpl: FetchLike = fetch) {
  const { clientId, clientSecret } = googleOAuthConfig()
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params }).toString(),
    signal: AbortSignal.timeout(20000),
  })
  const data: any = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Google sign-in: ${data?.error_description || data?.error || `HTTP ${res.status}`}`)
  return data as { access_token: string; refresh_token?: string; id_token?: string; expires_in?: number }
}

let cachedAccess: { token: string; expiresAt: number; refreshEnc: string } | null = null

async function accessTokenFor(pool: Pool): Promise<string> {
  const cfg = await loadConfig(pool)
  if (!cfg.refresh_token_enc) throw new Error('Google is not connected')
  if (cachedAccess && cachedAccess.refreshEnc === cfg.refresh_token_enc && cachedAccess.expiresAt > Date.now() + 60_000) {
    return cachedAccess.token
  }
  const data = await exchangeToken({ grant_type: 'refresh_token', refresh_token: decryptSecret(cfg.refresh_token_enc) })
  cachedAccess = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000, refreshEnc: cfg.refresh_token_enc }
  return data.access_token
}

/** Email from Google's id_token (received directly from Google's token endpoint over TLS). */
function emailFromIdToken(idToken?: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString('utf8'))
    return typeof payload.email === 'string' ? payload.email : null
  } catch {
    return null
  }
}

const adminPageUrl = (query: string) => `${getAdminPanelOrigin()}/loginasadmin/google-reviews?${query}`

/** GET /api/google-reviews/oauth/callback — Google redirects here after the admin signs in. */
export async function oauthCallback(pool: Pool, req: Request, res: Response) {
  const fail = (reason: string) => res.redirect(adminPageUrl(`google=error&reason=${encodeURIComponent(reason)}`))
  try {
    const { code, state, error } = req.query as Record<string, string | undefined>
    if (error) return fail(error === 'access_denied' ? 'Google sign-in was cancelled' : `Google: ${error}`)
    if (!code || !state) return fail('Missing code from Google')
    // One-time state issued by POST /api/admin/google-reviews/connect (an authenticated admin)
    const { rows } = await pool.query(
      `UPDATE google_reviews_config SET oauth_state = NULL, oauth_state_expires = NULL
       WHERE id = 1 AND oauth_state = $1 AND oauth_state_expires > NOW()
       RETURNING id`,
      [state]
    )
    if (!rows.length) return fail('This sign-in link expired. Click Connect Google again.')

    const { redirectUri } = googleOAuthConfig()
    const tokens = await exchangeToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
    if (!tokens.refresh_token) return fail('Google did not return offline access. Remove the app at myaccount.google.com/permissions and connect again.')
    await pool.query(
      `UPDATE google_reviews_config SET refresh_token_enc = $1, connected_email = $2, last_error = NULL, updated_at = NOW() WHERE id = 1`,
      [encryptSecret(tokens.refresh_token), emailFromIdToken(tokens.id_token)]
    )
    cachedAccess = null

    // One location: pick it and sync straight away. Several: the admin page asks which one.
    try {
      const locations = await listLocations(pool)
      if (locations.length === 1) {
        await selectLocation(pool, locations[0].accountName, locations[0].locationName, locations[0].title)
        await syncGoogleReviews(pool)
      }
    } catch (err) {
      await pool.query('UPDATE google_reviews_config SET last_error = $1 WHERE id = 1', [(err as Error).message])
    }
    res.redirect(adminPageUrl('google=connected'))
  } catch (err) {
    console.error('[google-reviews] OAuth callback failed:', err)
    fail((err as Error).message)
  }
}

// ---- locations & sync ------------------------------------------------------------------------

type LocationOption = { accountName: string; accountTitle: string; locationName: string; title: string; address: string }

async function listLocations(pool: Pool): Promise<LocationOption[]> {
  const token = await accessTokenFor(pool)
  const accounts: any[] = (await googleGet(ACCOUNTS_URL, token)).accounts || []
  const out: LocationOption[] = []
  for (const acc of accounts) {
    let pageToken = ''
    do {
      const url = new URL(`${INFO_BASE}/${acc.name}/locations`)
      url.searchParams.set('readMask', 'name,title,storefrontAddress')
      url.searchParams.set('pageSize', '100')
      if (pageToken) url.searchParams.set('pageToken', pageToken)
      const data = await googleGet(url.toString(), token)
      for (const loc of data.locations || []) {
        const a = loc.storefrontAddress || {}
        out.push({
          accountName: acc.name,
          accountTitle: acc.accountName || '',
          locationName: loc.name,
          title: loc.title || loc.name,
          address: [...(a.addressLines || []), a.locality, a.administrativeArea].filter(Boolean).join(', '),
        })
      }
      pageToken = data.nextPageToken || ''
    } while (pageToken)
  }
  return out
}

async function selectLocation(pool: Pool, accountName: string, locationName: string, title?: string) {
  await pool.query(
    `UPDATE google_reviews_config
     SET account_name = $1, location_name = $2, location_title = $3,
         place_id = NULL, maps_uri = NULL, new_review_uri = NULL, average_rating = NULL, total_reviews = NULL, updated_at = NOW()
     WHERE id = 1`,
    [accountName, locationName, title || null]
  )
}

let syncInFlight: Promise<{ synced: number; removed: number; averageRating: number | null; totalReviews: number | null }> | null = null

/** Pull every review of the selected location into google_reviews. Safe to call concurrently. */
export function syncGoogleReviews(pool: Pool) {
  if (!syncInFlight) {
    syncInFlight = runSync(pool).finally(() => { syncInFlight = null })
  }
  return syncInFlight
}

async function runSync(pool: Pool) {
  const cfg = await loadConfig(pool)
  try {
    if (!cfg.refresh_token_enc) throw new Error('Google is not connected')
    if (!cfg.account_name || !cfg.location_name) throw new Error('Choose which Google Business location to use')
    const token = await accessTokenFor(pool)

    // Listing details: Maps link and the "write a review" link for the storefront buttons
    const info = await googleGet(`${INFO_BASE}/${cfg.location_name}?readMask=title,metadata`, token).catch(() => null)
    const locationId = String(cfg.location_name).replace(/^locations\//, '')
    const { reviews, averageRating, totalReviewCount, complete } = await fetchAllReviews(token, `${cfg.account_name}/locations/${locationId}`)

    const ids: string[] = []
    for (const r of reviews) {
      if (!r.reviewId) continue
      ids.push(r.reviewId)
      const rating = starRatingToNumber(r.starRating)
      const comment = cleanReviewComment(r.comment)
      const anonymous = !!r.reviewer?.isAnonymous
      await pool.query(
        `INSERT INTO google_reviews (review_id, location_name, reviewer_name, reviewer_photo_url, is_anonymous, rating, comment, reply,
                                     review_created_at, review_updated_at, is_visible, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (review_id) DO UPDATE SET
           location_name = EXCLUDED.location_name, reviewer_name = EXCLUDED.reviewer_name, reviewer_photo_url = EXCLUDED.reviewer_photo_url,
           is_anonymous = EXCLUDED.is_anonymous, rating = EXCLUDED.rating, comment = EXCLUDED.comment, reply = EXCLUDED.reply,
           review_created_at = EXCLUDED.review_created_at, review_updated_at = EXCLUDED.review_updated_at, synced_at = NOW(),
           -- an edited review is re-checked against the default rule unless an admin chose its visibility
           is_visible = CASE WHEN google_reviews.admin_override THEN google_reviews.is_visible ELSE EXCLUDED.is_visible END`,
        [
          r.reviewId, cfg.location_name, anonymous ? null : r.reviewer?.displayName || null, anonymous ? null : r.reviewer?.profilePhotoUrl || null,
          anonymous, rating, comment || null, r.reviewReply?.comment?.trim() || null,
          r.createTime || null, r.updateTime || null, defaultVisible(rating, comment),
        ]
      )
    }

    // Reviews deleted on Google disappear here too (only after a complete read, never on a partial one)
    let removed = 0
    if (complete) {
      const del = await pool.query(
        'DELETE FROM google_reviews WHERE location_name = $1 AND NOT (review_id = ANY($2::text[]))',
        [cfg.location_name, ids]
      )
      removed = del.rowCount || 0
    }

    await pool.query(
      `UPDATE google_reviews_config
       SET average_rating = $1, total_reviews = $2, place_id = $3, maps_uri = $4, new_review_uri = $5,
           location_title = COALESCE($6, location_title), last_sync_at = NOW(), last_error = NULL, updated_at = NOW()
       WHERE id = 1`,
      [
        averageRating, totalReviewCount ?? reviews.length, info?.metadata?.placeId || null,
        info?.metadata?.mapsUri || null, info?.metadata?.newReviewUri || null, info?.title || null,
      ]
    )
    return { synced: ids.length, removed, averageRating, totalReviews: totalReviewCount ?? reviews.length }
  } catch (err) {
    await pool.query('UPDATE google_reviews_config SET last_error = $1, updated_at = NOW() WHERE id = 1', [(err as Error).message]).catch(() => {})
    throw err
  }
}

/** Daily cron: sync when connected; quiet when Google isn't set up. */
export async function scheduledGoogleReviewSync(pool: Pool) {
  const cfg = await loadConfig(pool)
  if (!cfg.refresh_token_enc || !cfg.location_name) return
  try {
    const r = await syncGoogleReviews(pool)
    console.log(`[google-reviews] synced ${r.synced} review(s), removed ${r.removed}`)
  } catch (err) {
    console.error('[google-reviews] scheduled sync failed:', (err as Error).message)
  }
}

// ---- public ----------------------------------------------------------------------------------

/** GET /api/google-reviews — rating summary + reviews chosen for the storefront. */
export async function publicGoogleReviews(pool: Pool, _req: Request, res: Response) {
  try {
    const cfg = await loadConfig(pool)
    if (!cfg.location_name) {
      res.setHeader('Cache-Control', 'public, max-age=300')
      return sendSuccess(res, { rating: null, total: 0, reviews: [] })
    }
    const { rows } = await pool.query(
      `SELECT id, reviewer_name, reviewer_photo_url, rating, comment, reply, review_created_at, is_featured
       FROM google_reviews
       WHERE location_name = $1 AND is_visible = true
       ORDER BY is_featured DESC, review_created_at DESC NULLS LAST
       LIMIT $2`,
      [cfg.location_name, PUBLIC_LIMIT]
    )
    res.setHeader('Cache-Control', 'public, max-age=300')
    sendSuccess(res, {
      rating: cfg.average_rating != null ? Number(cfg.average_rating) : null,
      total: cfg.total_reviews || 0,
      title: cfg.location_title || null,
      mapsUrl: cfg.maps_uri || (cfg.place_id ? `https://www.google.com/maps/place/?q=place_id:${cfg.place_id}` : null),
      writeReviewUrl: cfg.new_review_uri || (cfg.place_id ? `https://search.google.com/local/writereview?placeid=${cfg.place_id}` : null),
      reviews: rows.map((r) => ({
        id: r.id,
        name: r.reviewer_name || 'A Google user',
        photo: r.reviewer_photo_url,
        rating: r.rating,
        comment: r.comment,
        reply: r.reply,
        date: r.review_created_at,
        featured: r.is_featured,
      })),
    })
  } catch (err) {
    sendError(res, 500, 'Failed to load Google reviews', err)
  }
}

// ---- admin (mounted under /api/admin/*, staff only) --------------------------------------------

export async function adminStatus(pool: Pool, _req: Request, res: Response) {
  try {
    const cfg = await loadConfig(pool)
    const oauth = googleOAuthConfig()
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_visible)::int AS visible
       FROM google_reviews WHERE location_name = $1`,
      [cfg.location_name || '']
    )
    sendSuccess(res, {
      configured: oauth.configured,
      encryptionReady: !!encryptionKey(),
      redirectUri: oauth.redirectUri,
      connected: !!cfg.refresh_token_enc,
      connectedEmail: cfg.connected_email || null,
      location: cfg.location_name ? { accountName: cfg.account_name, locationName: cfg.location_name, title: cfg.location_title } : null,
      rating: cfg.average_rating != null ? Number(cfg.average_rating) : null,
      totalReviews: cfg.total_reviews || 0,
      mapsUrl: cfg.maps_uri || null,
      lastSyncAt: cfg.last_sync_at || null,
      lastError: cfg.last_error || null,
      stored: rows[0]?.total || 0,
      shown: rows[0]?.visible || 0,
    })
  } catch (err) {
    sendError(res, 500, 'Failed to load Google reviews status', err)
  }
}

/** POST /api/admin/google-reviews/connect — returns the Google sign-in URL with a one-time state. */
export async function adminConnect(pool: Pool, _req: Request, res: Response) {
  try {
    const oauth = googleOAuthConfig()
    if (!oauth.configured) return sendError(res, 400, 'Add GOOGLE_BUSINESS_CLIENT_ID and GOOGLE_BUSINESS_CLIENT_SECRET to the backend .env first')
    if (!encryptionKey()) return sendError(res, 400, 'Add ENCRYPTION_KEY to the backend .env first')
    const state = crypto.randomBytes(24).toString('hex')
    await pool.query(
      `UPDATE google_reviews_config SET oauth_state = $1, oauth_state_expires = NOW() + make_interval(mins => $2::int) WHERE id = 1`,
      [state, STATE_TTL_MINUTES]
    )
    const url = new URL(AUTH_URL)
    url.searchParams.set('client_id', oauth.clientId)
    url.searchParams.set('redirect_uri', oauth.redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', SCOPES.join(' '))
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
    url.searchParams.set('include_granted_scopes', 'true')
    url.searchParams.set('state', state)
    sendSuccess(res, { url: url.toString() })
  } catch (err) {
    sendError(res, 500, 'Failed to start Google sign-in', err)
  }
}

export async function adminLocations(pool: Pool, _req: Request, res: Response) {
  try {
    sendSuccess(res, await listLocations(pool))
  } catch (err) {
    sendError(res, 502, (err as Error).message || 'Failed to list Google locations', err)
  }
}

/** PUT /api/admin/google-reviews/location { accountName, locationName, title } — then syncs. */
export async function adminSelectLocation(pool: Pool, req: Request, res: Response) {
  try {
    const { accountName, locationName, title } = req.body || {}
    if (!/^accounts\/[\w-]+$/.test(String(accountName)) || !/^locations\/[\w-]+$/.test(String(locationName))) {
      return sendError(res, 400, 'Invalid Google location')
    }
    await selectLocation(pool, accountName, locationName, typeof title === 'string' ? title.slice(0, 200) : undefined)
    const result = await syncGoogleReviews(pool)
    sendSuccess(res, result)
  } catch (err) {
    sendError(res, 502, (err as Error).message || 'Failed to use this location', err)
  }
}

export async function adminSync(pool: Pool, _req: Request, res: Response) {
  try {
    sendSuccess(res, await syncGoogleReviews(pool))
  } catch (err) {
    sendError(res, 502, (err as Error).message || 'Google sync failed', err)
  }
}

/** POST /api/admin/google-reviews/disconnect — revokes Google access; the section hides until reconnected. */
export async function adminDisconnect(pool: Pool, _req: Request, res: Response) {
  try {
    const cfg = await loadConfig(pool)
    if (cfg.refresh_token_enc) {
      try {
        await fetch(`${REVOKE_URL}?token=${encodeURIComponent(decryptSecret(cfg.refresh_token_enc))}`, { method: 'POST', signal: AbortSignal.timeout(10000) })
      } catch {
        // Revoking is best effort; the token is removed here either way
      }
    }
    await pool.query(
      `UPDATE google_reviews_config SET refresh_token_enc = NULL, connected_email = NULL, account_name = NULL, location_name = NULL,
         location_title = NULL, place_id = NULL, maps_uri = NULL, new_review_uri = NULL, average_rating = NULL, total_reviews = NULL,
         last_error = NULL, updated_at = NOW()
       WHERE id = 1`
    )
    cachedAccess = null
    sendSuccess(res, { disconnected: true })
  } catch (err) {
    sendError(res, 500, 'Failed to disconnect Google', err)
  }
}

/** GET /api/admin/google-reviews/reviews — every synced review of the current location. */
export async function adminListReviews(pool: Pool, _req: Request, res: Response) {
  try {
    const cfg = await loadConfig(pool)
    const { rows } = await pool.query(
      `SELECT id, reviewer_name, reviewer_photo_url, is_anonymous, rating, comment, reply, review_created_at,
              is_visible, is_featured, admin_override
       FROM google_reviews WHERE location_name = $1
       ORDER BY review_created_at DESC NULLS LAST`,
      [cfg.location_name || '']
    )
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to load Google reviews', err)
  }
}

/** PATCH /api/admin/google-reviews/reviews/:id { is_visible?, is_featured? } */
export async function adminUpdateReview(pool: Pool, req: Request, res: Response) {
  try {
    const featured = typeof req.body?.is_featured === 'boolean' ? req.body.is_featured : undefined
    // Featuring a review also shows it
    const visible = featured === true ? true : typeof req.body?.is_visible === 'boolean' ? req.body.is_visible : undefined
    const sets: string[] = []
    const values: any[] = [req.params.id]
    if (visible !== undefined) {
      values.push(visible)
      sets.push(`is_visible = $${values.length}`, 'admin_override = true')
    }
    if (featured !== undefined) {
      values.push(featured)
      sets.push(`is_featured = $${values.length}`)
    }
    if (!sets.length) return sendError(res, 400, 'Nothing to update')
    const { rows } = await pool.query(
      `UPDATE google_reviews SET ${sets.join(', ')} WHERE id = $1 RETURNING id, is_visible, is_featured, admin_override`,
      values
    )
    if (!rows.length) return sendError(res, 404, 'Review not found')
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update review', err)
  }
}
