/**
 * Instagram Business Login OAuth + Insights Routes
 *
 * Uses the Instagram API with Instagram Login (launched July 2024).
 * NO Facebook Page or Facebook Login required — users log in directly with Instagram.
 *
 * OAuth flow:
 *  1. GET  /api/instagram/connect?collab_id=X  → redirects to Instagram OAuth dialog
 *  2. GET  /api/instagram/callback             → exchanges code, stores token, redirects back
 *  3. GET  /api/instagram/status?collab_id=X   → returns connection status
 *  4. POST /api/instagram/disconnect           → clears tokens
 *
 * Scopes used:
 *  - instagram_business_basic        (profile info + media list)
 *  - instagram_business_manage_insights  (views/likes on reels — requires Advanced Access)
 *
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 */

import { Request, Response, Router } from 'express'
import { Pool } from 'pg'

const IG_API = 'https://api.instagram.com'
const IG_GRAPH = 'https://graph.instagram.com'

// Nefol-related keywords reels must include in caption/hashtags
export const NEFOL_KEYWORDS = ['nefol', 'neföl', '#nefol', '#neföl', 'nefol skincare', 'nefol hair', 'nefoltest']

/** Extract the shortcode from a standard Instagram reel URL */
export function extractShortcode(url: string): string | null {
  const m = url.match(/\/reel\/([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

/** Check whether a caption contains at least one NEFOL keyword */
export function captionMentionsNefol(caption: string | null | undefined): boolean {
  if (!caption) return false
  const lower = caption.toLowerCase()
  return NEFOL_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))
}

/**
 * Exchange a short-lived Instagram user token for a long-lived one (~60 days).
 * Uses graph.instagram.com (not graph.facebook.com) for the IG Business Login flow.
 */
async function exchangeForLongLivedToken(
  shortToken: string
): Promise<{ access_token: string; token_type: string; expires_in: number } | null> {
  try {
    const url = new URL(`${IG_GRAPH}/access_token`)
    url.searchParams.set('grant_type', 'ig_exchange_token')
    url.searchParams.set('client_secret', process.env.META_APP_SECRET || '')
    url.searchParams.set('access_token', shortToken)

    const res = await fetch(url.toString())
    const data = (await res.json()) as any
    if (data.error) {
      console.error('Long-lived IG token exchange error:', data.error)
      return null
    }
    return data
  } catch (err) {
    console.error('exchangeForLongLivedToken error:', err)
    return null
  }
}

/**
 * Fetch real views + likes for a reel URL using the connected IG user token.
 * - Media list fetched from graph.instagram.com/me/media
 * - Insights fetched from graph.instagram.com/{media_id}/insights
 * - Uses `views` metric (replaces deprecated `plays` as of April 2025)
 */
export async function fetchReelData(
  reelUrl: string,
  igUserToken: string,
  _igUserId: string // kept for API compat, not needed with IG Business Login
): Promise<{ views: number; likes: number; postedAt: string | null; caption: string | null } | null> {
  try {
    const shortcode = extractShortcode(reelUrl)
    if (!shortcode) return null

    // Paginate up to 3 pages (75 items) to locate the reel by shortcode
    let nextCursor: string | undefined
    let found: any = null

    for (let page = 0; page < 3 && !found; page++) {
      const params = new URLSearchParams({
        fields: 'id,shortcode,media_type,timestamp,caption,like_count',
        limit: '25',
        access_token: igUserToken,
      })
      if (nextCursor) params.set('after', nextCursor)

      const mediaRes = await fetch(`${IG_GRAPH}/me/media?${params}`)
      const mediaData = (await mediaRes.json()) as any

      if (mediaData.error) {
        console.error('IG media fetch error:', mediaData.error)
        return null
      }

      const items: any[] = mediaData.data || []
      found = items.find((m) => m.shortcode === shortcode && m.media_type === 'VIDEO')
      nextCursor = mediaData.paging?.cursors?.after
      if (!mediaData.paging?.next) break
    }

    if (!found) return null

    const likes = Number(found.like_count) || 0
    const postedAt: string | null = found.timestamp || null
    const caption: string | null = found.caption || null

    // Fetch video insights — `views` metric (as of April 2025, replaces `plays`)
    let views = 0
    try {
      const insightsRes = await fetch(
        `${IG_GRAPH}/${found.id}/insights?metric=views&access_token=${igUserToken}`
      )
      const insightsData = (await insightsRes.json()) as any

      if (!insightsData.error && insightsData.data?.length) {
        const viewsMetric = insightsData.data.find((m: any) => m.name === 'views')
        views =
          Number(viewsMetric?.total_value?.value ?? 0) ||
          Number(viewsMetric?.values?.[0]?.value ?? 0)
      }
    } catch (e) {
      console.warn('Insights fetch failed (non-fatal):', e)
    }

    return { views, likes, postedAt, caption }
  } catch (err) {
    console.error('fetchReelData error:', err)
    return null
  }
}

/** Read the IG user token and ig_user_id for a collab from DB */
export async function getPageTokenForCollab(
  pool: Pool,
  collabId: number
): Promise<{ pageToken: string; igUserId: string } | null> {
  try {
    const { rows } = await pool.query(
      `SELECT fb_page_access_token, ig_user_id FROM collab_applications WHERE id = $1`,
      [collabId]
    )
    const row = rows[0]
    if (!row?.fb_page_access_token || !row?.ig_user_id) return null
    return { pageToken: row.fb_page_access_token, igUserId: row.ig_user_id }
  } catch {
    return null
  }
}

// ==================== Route Handlers ====================

export async function handleConnect(_pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query as Record<string, string>
  if (!collab_id) return res.status(400).send('collab_id is required')

  const appId = process.env.META_APP_ID
  if (!appId) return res.status(500).send('META_APP_ID not configured')

  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 2000}`
  const redirectUri = `${backendUrl}/api/instagram/callback`

  // Direct Instagram OAuth — no Facebook Page needed
  const scope = ['instagram_business_basic', 'instagram_business_manage_insights'].join(',')

  const oauthUrl =
    `${IG_API}/oauth/authorize?` +
    `client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&response_type=code` +
    `&state=${encodeURIComponent(collab_id)}`

  return res.redirect(oauthUrl)
}

export async function handleCallback(pool: Pool, req: Request, res: Response) {
  const { code, state: collabId, error, error_description } = req.query as Record<string, string>

  const frontendUrl = process.env.USER_PANEL_URL || process.env.CLIENT_ORIGIN || 'http://localhost:2001'
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 2000}`

  if (error || !code) {
    console.error('Instagram OAuth error:', error, error_description)
    return res.redirect(
      `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent(error_description || error || 'OAuth failed')}`
    )
  }

  try {
    const redirectUri = `${backendUrl}/api/instagram/callback`

    // Step 1: Exchange authorization code → short-lived IG user token
    const tokenBody = new URLSearchParams({
      client_id: process.env.META_APP_ID || '',
      client_secret: process.env.META_APP_SECRET || '',
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    })

    const tokenRes = await fetch(`${IG_API}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    })
    const tokenData = (await tokenRes.json()) as any

    if (tokenData.error_type || !tokenData.access_token) {
      console.error('IG token exchange error:', tokenData)
      return res.redirect(
        `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent('Instagram token exchange failed. Please try again.')}`
      )
    }

    const shortToken: string = tokenData.access_token
    const igUserIdFromToken: string = String(tokenData.user_id || '')

    // Step 2: Exchange → long-lived token (~60 days)
    const longTokenData = await exchangeForLongLivedToken(shortToken)
    const igUserToken = longTokenData?.access_token || shortToken
    const expiresIn = longTokenData?.expires_in || 3600
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

    // Step 3: Fetch IG username from profile
    const profileRes = await fetch(
      `${IG_GRAPH}/me?fields=user_id,username,account_type&access_token=${igUserToken}`
    )
    const profile = (await profileRes.json()) as any

    if (profile.error) {
      console.error('IG profile fetch error:', profile.error)
      return res.redirect(
        `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent('Could not fetch Instagram profile. Make sure you have a Professional account.')}`
      )
    }

    const igUserId: string = String(profile.user_id || igUserIdFromToken)
    const igUsername: string = profile.username || ''
    const accountType: string = profile.account_type || ''

    // Only Business and Creator accounts can access insights
    if (accountType && accountType.toLowerCase() === 'personal') {
      return res.redirect(
        `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent(
          'Personal Instagram accounts cannot be connected. Please switch your account to Creator or Business in Instagram Settings → Account → Switch to Professional Account.'
        )}`
      )
    }

    // Step 4: Store token in DB
    // We store the IG user token in fb_page_access_token for backward compat with fetchReelData
    await pool.query(
      `UPDATE collab_applications
       SET instagram_connected  = true,
           fb_user_access_token = $1,
           fb_page_id           = NULL,
           fb_page_access_token = $1,
           ig_user_id           = $2,
           ig_username          = $3,
           token_expires_at     = $4,
           token_updated_at     = NOW(),
           updated_at           = NOW()
       WHERE id = $5`,
      [igUserToken, igUserId, igUsername, tokenExpiresAt, collabId]
    )

    console.log(`✅ Instagram (direct) connected for collab ${collabId}: @${igUsername} (${accountType})`)
    return res.redirect(`${frontendUrl}/#/user/collab?ig_connected=1`)
  } catch (err) {
    console.error('Instagram callback error:', err)
    return res.redirect(
      `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent('Connection failed. Please try again.')}`
    )
  }
}

export async function handleStatus(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query as Record<string, string>
  if (!collab_id) return res.status(400).json({ message: 'collab_id required' })

  try {
    const { rows } = await pool.query(
      `SELECT instagram_connected, ig_username, ig_user_id, token_expires_at FROM collab_applications WHERE id = $1`,
      [collab_id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Collab not found' })
    const r = rows[0]
    return res.json({
      connected: !!r.instagram_connected,
      ig_username: r.ig_username || null,
      ig_user_id: r.ig_user_id || null,
      token_expires_at: r.token_expires_at || null,
    })
  } catch (err) {
    console.error('Instagram status error:', err)
    return res.status(500).json({ message: 'Failed to get status' })
  }
}

export async function handleDisconnect(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.body as { collab_id?: number }
  if (!collab_id) return res.status(400).json({ message: 'collab_id required' })

  try {
    await pool.query(
      `UPDATE collab_applications
       SET instagram_connected  = false,
           fb_user_access_token = NULL,
           fb_page_id           = NULL,
           fb_page_access_token = NULL,
           ig_user_id           = NULL,
           ig_username          = NULL,
           token_expires_at     = NULL,
           updated_at           = NOW()
       WHERE id = $1`,
      [collab_id]
    )
    return res.json({ message: 'Instagram disconnected' })
  } catch (err) {
    console.error('Instagram disconnect error:', err)
    return res.status(500).json({ message: 'Failed to disconnect' })
  }
}

export default function instagramRouter(pool: Pool) {
  const router = Router()
  router.get('/connect', (req, res) => handleConnect(pool, req, res))
  router.get('/callback', (req, res) => handleCallback(pool, req, res))
  router.get('/status', (req, res) => handleStatus(pool, req, res))
  router.post('/disconnect', (req, res) => handleDisconnect(pool, req, res))
  return router
}
