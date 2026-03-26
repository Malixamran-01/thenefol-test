/**
 * Instagram Graph API OAuth + Insights Routes
 *
 * Flow:
 *  1. GET  /api/instagram/connect?collab_id=X  → redirects to Meta OAuth dialog
 *  2. GET  /api/instagram/callback             → exchanges code, stores tokens, redirects user back
 *  3. GET  /api/instagram/status?collab_id=X   → returns connection status for a collab
 *  4. POST /api/instagram/disconnect           → clears tokens for a collab
 *
 * Internal (used by collab routes):
 *  - fetchReelData(reelUrl, accessToken, igUserId) → { views, likes, postedAt, caption }
 */

import { Request, Response, Router } from 'express'
import { Pool } from 'pg'

const META_API_VERSION = process.env.META_API_VERSION || 'v21.0'
const META_GRAPH = `https://graph.facebook.com/${META_API_VERSION}`
const IG_GRAPH = `https://graph.instagram.com/${META_API_VERSION}`

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

/** Exchange short-lived user token → long-lived user token (~60 days) */
async function exchangeForLongLivedToken(shortToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const url = new URL(`${META_GRAPH}/oauth/access_token`)
    url.searchParams.set('grant_type', 'fb_exchange_token')
    url.searchParams.set('client_id', process.env.META_APP_ID || '')
    url.searchParams.set('client_secret', process.env.META_APP_SECRET || '')
    url.searchParams.set('fb_exchange_token', shortToken)

    const res = await fetch(url.toString())
    const data = await res.json() as any
    if (data.error) { console.error('Long-lived token exchange error:', data.error); return null }
    return data
  } catch (err) {
    console.error('exchangeForLongLivedToken error:', err)
    return null
  }
}

/** Get the user's FB pages and resolve the linked Instagram Business Account */
async function resolveIgAccount(userToken: string): Promise<{ pageId: string; igUserId: string; igUsername: string } | null> {
  try {
    // 1. Get pages
    const pagesRes = await fetch(`${META_GRAPH}/me/accounts?access_token=${userToken}`)
    const pagesData = await pagesRes.json() as any
    if (!pagesData.data?.length) return null

    // Use the first page (most collab users have one page)
    const page = pagesData.data[0]
    const pageToken: string = page.access_token
    const pageId: string = page.id

    // 2. Get Instagram Business Account linked to this page
    const igRes = await fetch(
      `${META_GRAPH}/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
    )
    const igData = await igRes.json() as any
    const igUserId: string = igData.instagram_business_account?.id
    if (!igUserId) return null

    // 3. Get IG username
    const igProfileRes = await fetch(
      `${META_GRAPH}/${igUserId}?fields=username&access_token=${pageToken}`
    )
    const igProfile = await igProfileRes.json() as any

    return { pageId, igUserId, igUsername: igProfile.username || '' }
  } catch (err) {
    console.error('resolveIgAccount error:', err)
    return null
  }
}

/**
 * Fetch real views + likes for a reel URL using the connected IG account token.
 * Returns null if reel not found or not accessible.
 */
export async function fetchReelData(
  reelUrl: string,
  pageAccessToken: string,
  igUserId: string
): Promise<{ views: number; likes: number; postedAt: string | null; caption: string | null } | null> {
  try {
    const shortcode = extractShortcode(reelUrl)
    if (!shortcode) return null

    // Fetch media list (paginate up to 3 pages = 75 items to find the reel)
    let nextCursor: string | undefined
    let found: any = null

    for (let page = 0; page < 3 && !found; page++) {
      const params = new URLSearchParams({
        fields: 'id,shortcode,media_type,timestamp,caption,like_count',
        limit: '25',
        access_token: pageAccessToken,
      })
      if (nextCursor) params.set('after', nextCursor)

      const mediaRes = await fetch(`${META_GRAPH}/${igUserId}/media?${params}`)
      const mediaData = await mediaRes.json() as any

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
    const postedAt: string = found.timestamp || null
    const caption: string | null = found.caption || null

    // Fetch video insights (plays = views for reels)
    let views = 0
    try {
      const insightsRes = await fetch(
        `${META_GRAPH}/${found.id}/insights?metric=plays,reach&access_token=${pageAccessToken}`
      )
      const insightsData = await insightsRes.json() as any
      if (!insightsData.error) {
        const playsMetric = insightsData.data?.find((m: any) => m.name === 'plays')
        views = Number(playsMetric?.values?.[0]?.value ?? playsMetric?.id?.split('?')[0] ?? 0)
        // Some API versions return total_value instead
        if (!views) {
          views = Number(playsMetric?.total_value?.value ?? 0)
        }
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

/** Refresh a long-lived page token (pages tokens don't expire if refreshed) */
export async function getPageTokenForCollab(pool: Pool, collabId: number): Promise<{ pageToken: string; igUserId: string } | null> {
  try {
    const { rows } = await pool.query(
      `SELECT fb_page_id, fb_page_access_token, ig_user_id FROM collab_applications WHERE id = $1`,
      [collabId]
    )
    const row = rows[0]
    if (!row?.fb_page_access_token || !row?.ig_user_id) return null
    return { pageToken: row.fb_page_access_token, igUserId: row.ig_user_id }
  } catch (e) {
    return null
  }
}

// ==================== Route Handlers ====================

export async function handleConnect(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query as Record<string, string>
  if (!collab_id) return res.status(400).send('collab_id is required')

  const appId = process.env.META_APP_ID
  if (!appId) return res.status(500).send('META_APP_ID not configured')

  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 2000}`
  const redirectUri = `${backendUrl}/api/instagram/callback`

  const scope = [
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_insights',
  ].join(',')

  const oauthUrl =
    `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?` +
    `client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(collab_id)}` +
    `&response_type=code`

  return res.redirect(oauthUrl)
}

export async function handleCallback(pool: Pool, req: Request, res: Response) {
  const { code, state: collabId, error, error_description } = req.query as Record<string, string>

  const frontendUrl = process.env.USER_PANEL_URL || process.env.CLIENT_ORIGIN || 'http://localhost:2001'
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 2000}`

  if (error || !code) {
    console.error('Instagram OAuth error:', error, error_description)
    return res.redirect(`${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent(error_description || error || 'OAuth failed')}`)
  }

  try {
    const redirectUri = `${backendUrl}/api/instagram/callback`

    // 1. Exchange code → short-lived user token
    const tokenUrl =
      `${META_GRAPH}/oauth/access_token?` +
      `client_id=${process.env.META_APP_ID}` +
      `&client_secret=${process.env.META_APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`

    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json() as any

    if (tokenData.error || !tokenData.access_token) {
      console.error('Token exchange error:', tokenData.error)
      return res.redirect(`${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent('Token exchange failed')}`)
    }

    // 2. Exchange → long-lived user token (~60 days)
    const longToken = await exchangeForLongLivedToken(tokenData.access_token)
    const userToken = longToken?.access_token || tokenData.access_token
    const expiresIn = longToken?.expires_in || 3600

    // 3. Resolve IG Business Account through the user's FB page
    const igAccount = await resolveIgAccount(userToken)
    if (!igAccount) {
      return res.redirect(
        `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent(
          'No Instagram Professional account found linked to a Facebook Page. Please ensure your Instagram account is a Creator or Business account and linked to a Facebook Page.'
        )}`
      )
    }

    // 4. Get long-lived page access token (pages tokens are non-expiring)
    const pagesRes = await fetch(`${META_GRAPH}/me/accounts?access_token=${userToken}`)
    const pagesData = await pagesRes.json() as any
    const page = pagesData.data?.find((p: any) => p.id === igAccount.pageId) || pagesData.data?.[0]
    const pageToken: string = page?.access_token || userToken
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

    // 5. Store in collab_applications
    await pool.query(
      `UPDATE collab_applications
       SET instagram_connected = true,
           fb_user_access_token = $1,
           fb_page_id = $2,
           fb_page_access_token = $3,
           ig_user_id = $4,
           ig_username = $5,
           token_expires_at = $6,
           token_updated_at = NOW(),
           updated_at = NOW()
       WHERE id = $7`,
      [userToken, igAccount.pageId, pageToken, igAccount.igUserId, igAccount.igUsername, tokenExpiresAt, collabId]
    )

    console.log(`✅ Instagram connected for collab ${collabId}: @${igAccount.igUsername}`)
    return res.redirect(`${frontendUrl}/#/user/collab?ig_connected=1`)
  } catch (err) {
    console.error('Instagram callback error:', err)
    return res.redirect(`${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent('Connection failed. Please try again.')}`)
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
       SET instagram_connected = false, fb_user_access_token = NULL,
           fb_page_access_token = NULL, ig_user_id = NULL, ig_username = NULL,
           token_expires_at = NULL, updated_at = NOW()
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
