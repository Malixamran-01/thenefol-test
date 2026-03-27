/**
 * Instagram OAuth via Facebook Login for Business
 *
 * Uses the standard Facebook Login flow which:
 *  - Is already configured in your Meta app (Facebook Login for Business product)
 *  - Redirect URIs go under: Facebook Login for Business → Settings → Valid OAuth Redirect URIs
 *  - Works with Instagram Creator/Business accounts linked through FB pages OR directly via instagram_basic
 *
 * Flow:
 *  1. GET  /api/instagram/connect?collab_id=X  → redirects to Facebook OAuth dialog
 *  2. GET  /api/instagram/callback             → exchanges code, resolves IG account, stores tokens
 *  3. GET  /api/instagram/status?collab_id=X   → returns connection status
 *  4. POST /api/instagram/disconnect           → clears tokens
 *  5. GET  /api/instagram/reels?collab_id=X    → fetches eligible reels for the picker UI
 */

import { Request, Response, Router } from 'express'
import { Pool } from 'pg'

const META_API_VERSION = process.env.META_API_VERSION || 'v21.0'
const META_GRAPH = `https://graph.facebook.com/${META_API_VERSION}`

// Keywords reels must include in caption/hashtags
export const NEFOL_KEYWORDS = ['nefol', 'neföl', '#nefol', '#neföl', 'nefol skincare', 'nefol hair', 'nefoltest']

export function extractShortcode(url: string): string | null {
  const m = url.match(/\/reel\/([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

export function captionMentionsNefol(caption: string | null | undefined): boolean {
  if (!caption) return false
  const lower = caption.toLowerCase()
  return NEFOL_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))
}

/** Exchange short-lived FB user token → long-lived (~60 days) */
async function exchangeForLongLivedToken(shortToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const url = new URL(`${META_GRAPH}/oauth/access_token`)
    url.searchParams.set('grant_type', 'fb_exchange_token')
    url.searchParams.set('client_id', process.env.META_APP_ID || '')
    url.searchParams.set('client_secret', process.env.META_APP_SECRET || '')
    url.searchParams.set('fb_exchange_token', shortToken)
    const res = await fetch(url.toString())
    const data = (await res.json()) as any
    if (data.error) { console.error('Long-lived token error:', data.error); return null }
    return data
  } catch (err) {
    console.error('exchangeForLongLivedToken error:', err)
    return null
  }
}

/**
 * Resolve the Instagram Business/Creator account.
 *
 * Strategy (in order):
 *  1. Loop through user's FB pages and find a linked IG Business account
 *  2. Try GET /me?fields=instagram_business_account directly on the user token
 *  3. Try GET /me?fields=id,username on graph.instagram.com (works if instagram_basic granted)
 *
 * Returns a unified shape — pageToken is the best token available for IG API calls.
 */
async function resolveIgAccount(
  userToken: string
): Promise<{ pageId: string | null; pageToken: string; igUserId: string; igUsername: string } | null> {
  try {
    // ── Strategy 1: Find IG account via FB pages ──────────────────────────
    const pagesRes = await fetch(`${META_GRAPH}/me/accounts?access_token=${userToken}`)
    const pagesData = (await pagesRes.json()) as any

    if (pagesData.data?.length) {
      for (const page of pagesData.data) {
        const igRes = await fetch(
          `${META_GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        )
        const igData = (await igRes.json()) as any
        const igUserId: string = igData.instagram_business_account?.id
        if (!igUserId) continue

        const profileRes = await fetch(
          `${META_GRAPH}/${igUserId}?fields=username&access_token=${page.access_token}`
        )
        const profile = (await profileRes.json()) as any

        console.log(`Resolved IG account via FB page: @${profile.username}`)
        return { pageId: page.id, pageToken: page.access_token, igUserId, igUsername: profile.username || '' }
      }
    }

    // ── Strategy 2: GET /me?fields=instagram_business_account on user token ──
    const meRes = await fetch(`${META_GRAPH}/me?fields=instagram_business_account&access_token=${userToken}`)
    const meData = (await meRes.json()) as any
    const igIdFromMe: string | undefined = meData.instagram_business_account?.id
    if (igIdFromMe) {
      const profileRes = await fetch(`${META_GRAPH}/${igIdFromMe}?fields=username&access_token=${userToken}`)
      const profile = (await profileRes.json()) as any
      console.log(`Resolved IG account via /me: @${profile.username}`)
      return { pageId: null, pageToken: userToken, igUserId: igIdFromMe, igUsername: profile.username || '' }
    }

    // ── Strategy 3: Try graph.instagram.com/me directly (instagram_basic) ──
    const igMeRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${userToken}`)
    const igMe = (await igMeRes.json()) as any
    if (!igMe.error && igMe.id) {
      console.log(`Resolved IG account via graph.instagram.com: @${igMe.username}`)
      return { pageId: null, pageToken: userToken, igUserId: igMe.id, igUsername: igMe.username || '' }
    }

    console.warn('resolveIgAccount: all strategies exhausted', { pagesCount: pagesData.data?.length ?? 0 })
    return null
  } catch (err) {
    console.error('resolveIgAccount error:', err)
    return null
  }
}

/**
 * Fetch real views + likes for a single reel URL.
 * Used when a reel is submitted to verify and store its current stats.
 */
export async function fetchReelData(
  reelUrl: string,
  pageAccessToken: string,
  igUserId: string
): Promise<{ views: number; likes: number; postedAt: string | null; caption: string | null } | null> {
  try {
    const shortcode = extractShortcode(reelUrl)
    if (!shortcode) return null

    let nextCursor: string | undefined
    let found: any = null

    for (let page = 0; page < 5 && !found; page++) {
      const params = new URLSearchParams({
        fields: 'id,shortcode,media_type,timestamp,caption,like_count',
        limit: '25',
        access_token: pageAccessToken,
      })
      if (nextCursor) params.set('after', nextCursor)

      const mediaRes = await fetch(`${META_GRAPH}/${igUserId}/media?${params}`)
      const mediaData = (await mediaRes.json()) as any
      if (mediaData.error) { console.error('IG media fetch error:', mediaData.error); return null }

      const items: any[] = mediaData.data || []
      found = items.find((m) => m.shortcode === shortcode && m.media_type === 'VIDEO')
      nextCursor = mediaData.paging?.cursors?.after
      if (!mediaData.paging?.next) break
    }

    if (!found) return null

    const likes = Number(found.like_count) || 0
    const postedAt: string | null = found.timestamp || null
    const caption: string | null = found.caption || null

    // Fetch insights — try `views` first (v22+), fall back to `impressions`
    let views = 0
    try {
      for (const metric of ['views', 'impressions']) {
        const insightsRes = await fetch(
          `${META_GRAPH}/${found.id}/insights?metric=${metric}&access_token=${pageAccessToken}`
        )
        const insightsData = (await insightsRes.json()) as any
        if (insightsData.error) continue
        const m = insightsData.data?.find((d: any) => d.name === metric)
        views = Number(m?.total_value?.value ?? m?.values?.[0]?.value ?? 0)
        if (views > 0) break
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

/** Fetch ALL eligible reels from IG for the picker UI */
export async function fetchEligibleReels(
  pageAccessToken: string,
  igUserId: string,
  collabJoinedAt: Date
): Promise<Array<{
  media_id: string
  shortcode: string
  reel_url: string
  thumbnail_url: string | null
  caption: string | null
  timestamp: string
  likes: number
  views: number
  caption_ok: boolean
  date_ok: boolean
  eligible: boolean
}>> {
  const results: any[] = []
  let nextCursor: string | undefined

  // Fetch up to 100 reels (4 pages × 25)
  for (let page = 0; page < 4; page++) {
    const params = new URLSearchParams({
      fields: 'id,shortcode,media_type,timestamp,caption,like_count,thumbnail_url,media_url',
      limit: '25',
      access_token: pageAccessToken,
    })
    if (nextCursor) params.set('after', nextCursor)

    const res = await fetch(`${META_GRAPH}/${igUserId}/media?${params}`)
    const data = (await res.json()) as any
    if (data.error) { console.error('fetchEligibleReels media error:', data.error); break }

    const items: any[] = (data.data || []).filter((m: any) => m.media_type === 'VIDEO')

    for (const item of items) {
      const postedAt = item.timestamp ? new Date(item.timestamp) : null
      const dateOk = postedAt !== null && postedAt >= collabJoinedAt
      const captionOk = captionMentionsNefol(item.caption)

      // Fetch insights for this reel
      let views = 0
      try {
        for (const metric of ['views', 'impressions']) {
          const iRes = await fetch(
            `${META_GRAPH}/${item.id}/insights?metric=${metric}&access_token=${pageAccessToken}`
          )
          const iData = (await iRes.json()) as any
          if (iData.error) continue
          const m = iData.data?.find((d: any) => d.name === metric)
          views = Number(m?.total_value?.value ?? m?.values?.[0]?.value ?? 0)
          if (views > 0) break
        }
      } catch { /* non-fatal */ }

      results.push({
        media_id: item.id,
        shortcode: item.shortcode || '',
        reel_url: `https://www.instagram.com/reel/${item.shortcode}/`,
        thumbnail_url: item.thumbnail_url || item.media_url || null,
        caption: item.caption || null,
        timestamp: item.timestamp,
        likes: Number(item.like_count) || 0,
        views,
        caption_ok: captionOk,
        date_ok: dateOk,
        eligible: captionOk && dateOk,
      })
    }

    nextCursor = data.paging?.cursors?.after
    if (!data.paging?.next) break
  }

  return results
}

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
  } catch { return null }
}

// ==================== Route Handlers ====================

export async function handleConnect(_pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query as Record<string, string>
  if (!collab_id) return res.status(400).send('collab_id is required')

  const appId = process.env.META_APP_ID
  if (!appId) return res.status(500).send('META_APP_ID not configured')

  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 2000}`
  const redirectUri = `${backendUrl}/api/instagram/callback`

  // These scopes work with Facebook Login for Business product
  // Redirect URI goes under: Facebook Login for Business → Settings → Valid OAuth Redirect URIs
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
    return res.redirect(
      `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent(error_description || error || 'OAuth failed')}`
    )
  }

  try {
    const redirectUri = `${backendUrl}/api/instagram/callback`

    // 1. Exchange code → short-lived FB user token
    const tokenUrl =
      `${META_GRAPH}/oauth/access_token?` +
      `client_id=${process.env.META_APP_ID}` +
      `&client_secret=${process.env.META_APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`

    const tokenRes = await fetch(tokenUrl)
    const tokenData = (await tokenRes.json()) as any

    if (tokenData.error || !tokenData.access_token) {
      console.error('Token exchange error:', tokenData.error)
      return res.redirect(
        `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent('Token exchange failed. Please try again.')}`
      )
    }

    // 2. Upgrade to long-lived token (~60 days)
    const longToken = await exchangeForLongLivedToken(tokenData.access_token)
    const userToken = longToken?.access_token || tokenData.access_token
    const expiresIn = longToken?.expires_in || 3600
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

    // 3. Resolve Instagram Business/Creator account (tries multiple strategies)
    const igAccount = await resolveIgAccount(userToken)
    if (!igAccount) {
      return res.redirect(
        `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent(
          'Could not find your Instagram Professional account. Fix: In Instagram app → Settings → Account → Switch to Professional Account (Creator) → Linked Accounts → Connect to Facebook. Then try again.'
        )}`
      )
    }

    // 4. Store in collab_applications
    await pool.query(
      `UPDATE collab_applications
       SET instagram_connected  = true,
           fb_user_access_token = $1,
           fb_page_id           = $2,
           fb_page_access_token = $3,
           ig_user_id           = $4,
           ig_username          = $5,
           token_expires_at     = $6,
           token_updated_at     = NOW(),
           updated_at           = NOW()
       WHERE id = $7`,
      [userToken, igAccount.pageId, igAccount.pageToken, igAccount.igUserId, igAccount.igUsername, tokenExpiresAt, collabId]
    )

    console.log(`✅ Instagram connected for collab ${collabId}: @${igAccount.igUsername}`)
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

/** GET /api/instagram/reels?collab_id=X — fetch eligible reels for the picker UI */
export async function handleFetchReels(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query as Record<string, string>
  if (!collab_id) return res.status(400).json({ message: 'collab_id required' })

  try {
    const { rows } = await pool.query(
      `SELECT instagram_connected, fb_page_access_token, ig_user_id, collab_joined_at, created_at, status
       FROM collab_applications WHERE id = $1`,
      [collab_id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Collab not found' })

    const app = rows[0]

    if (app.status !== 'approved') {
      return res.status(403).json({ message: 'Collab not yet approved.' })
    }

    if (!app.instagram_connected || !app.fb_page_access_token || !app.ig_user_id) {
      return res.status(403).json({ message: 'Instagram not connected.' })
    }

    const collabJoinedAt = new Date(app.collab_joined_at || app.created_at)

    // Fetch already-submitted reel URLs so we can mark them
    const submittedRes = await pool.query(
      `SELECT reel_url FROM collab_reels WHERE collab_application_id = $1`,
      [collab_id]
    )
    const submittedUrls = new Set(submittedRes.rows.map((r: any) => r.reel_url))

    const reels = await fetchEligibleReels(app.fb_page_access_token, app.ig_user_id, collabJoinedAt)

    return res.json({
      reels: reels.map((r) => ({ ...r, already_submitted: submittedUrls.has(r.reel_url) })),
      collab_joined_at: collabJoinedAt.toISOString(),
      nefol_keywords: NEFOL_KEYWORDS.filter((k) => k.startsWith('#')),
    })
  } catch (err) {
    console.error('handleFetchReels error:', err)
    return res.status(500).json({ message: 'Failed to fetch reels' })
  }
}

export default function instagramRouter(pool: Pool) {
  const router = Router()
  router.get('/connect', (req, res) => handleConnect(pool, req, res))
  router.get('/callback', (req, res) => handleCallback(pool, req, res))
  router.get('/status', (req, res) => handleStatus(pool, req, res))
  router.post('/disconnect', (req, res) => handleDisconnect(pool, req, res))
  router.get('/reels', (req, res) => handleFetchReels(pool, req, res))
  return router
}
