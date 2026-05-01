/**
 * Instagram Business Login — direct Instagram OAuth (no Facebook Page required)
 *
 * Uses api.instagram.com OAuth + graph.instagram.com for all API calls.
 * Redirect URIs configured under: Meta App → Instagram → API setup with Instagram login → Valid OAuth redirect URIs
 *
 * Requires Instagram Professional (Creator or Business) account.
 * No Facebook account or Facebook Page needed.
 *
 * Routes:
 *  GET  /api/instagram/connect?collab_id=X  → redirects to Instagram OAuth
 *  GET  /api/instagram/callback             → exchanges code, stores token
 *  GET  /api/instagram/status?collab_id=X   → connection status
 *  POST /api/instagram/disconnect           → clear tokens
 *  GET  /api/instagram/reels?collab_id=X    → fetch eligible reels for picker UI
 */

import { Request, Response, Router } from 'express'
import { Pool } from 'pg'
import { assertCollabNotBlockedByAppId } from '../utils/collabBlocks'
import { normalizeHandle, parseInstagramHandles } from '../utils/instagramHandles'
import { normalizeCollabContentUrl } from './platform'
import { getStaffContextByToken } from './staff'

// Instagram API endpoints (direct, no Facebook)
const IG_OAUTH   = 'https://api.instagram.com'
const IG_GRAPH   = 'https://graph.instagram.com'

// Keywords that must appear in reel captions
export const NEFOL_KEYWORDS = ['nefol', 'neföl', '#nefol', '#neföl', 'nefol skincare', 'nefol hair', 'nefoltest']

const IG_DUPLICATE_MSG =
  'This Instagram account is already linked to another Nefol account. Each creator must use their own Instagram.'

/** OAuth `state` value for brand/admin Instagram (same redirect URI as collab). */
export const ADMIN_BRAND_OAUTH_STATE = 'admin_brand'

export function getAdminPanelBaseUrl(): string {
  const u = process.env.ADMIN_PANEL_URL || process.env.VITE_ADMIN_URL || 'http://localhost:5173'
  return String(u).replace(/\/$/, '')
}

/**
 * One Instagram identity (IG user id and/or @handle) may not be tied to two different collab applications
 * (two Nefol users). Aligns with assertActiveCollabNotDuplicate on application submit.
 */
export async function assertInstagramIdentityAvailableForCollab(
  pool: Pool,
  collabId: number,
  igUserId: string,
  igUsername: string
): Promise<string | null> {
  const idStr = String(igUserId || '').trim()
  const normUser = normalizeHandle(igUsername)
  const { rows } = await pool.query(
    `SELECT id, instagram, instagram_connected, ig_username, ig_user_id
     FROM collab_applications
     WHERE id <> $1 AND status IN ('pending', 'approved')`,
    [collabId]
  )
  for (const row of rows) {
    const otherId = String(row.ig_user_id || '').trim()
    if (idStr && otherId && idStr === otherId) return IG_DUPLICATE_MSG
    if (normUser) {
      if (row.instagram_connected && row.ig_username && normalizeHandle(row.ig_username) === normUser) {
        return IG_DUPLICATE_MSG
      }
      const claimed = parseInstagramHandles(row.instagram, undefined)
      if (claimed.includes(normUser)) return IG_DUPLICATE_MSG
    }
  }
  return null
}

export function extractShortcode(url: string): string | null {
  const m = url.match(/\/reel\/([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

export function captionMentionsNefol(caption: string | null | undefined): boolean {
  if (!caption) return false
  const lower = caption.toLowerCase()
  return NEFOL_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))
}

/** Exchange short-lived IG token → long-lived (~60 days) */
async function exchangeForLongLivedToken(shortToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const url = new URL(`${IG_GRAPH}/access_token`)
    url.searchParams.set('grant_type', 'ig_exchange_token')
    url.searchParams.set('client_secret', process.env.INSTAGRAM_APP_SECRET || process.env.META_GRAPH_APP_SECRET || process.env.META_APP_SECRET || '')
    url.searchParams.set('access_token', shortToken)
    const res = await fetch(url.toString())
    const data = (await res.json()) as any
    if (data.error) { console.error('Long-lived IG token error:', data.error); return null }
    return data
  } catch (err) {
    console.error('exchangeForLongLivedToken:', err)
    return null
  }
}

/**
 * Fetch real views + likes for a single reel URL.
 * token = the IG user's long-lived token stored in fb_page_access_token column.
 */
export async function fetchReelData(
  reelUrl: string,
  igUserToken: string,
  _igUserId: string  // kept for API compatibility, not needed with direct IG login
): Promise<{ views: number; likes: number; postedAt: string | null; caption: string | null } | null> {
  try {
    const shortcode = extractShortcode(reelUrl)
    if (!shortcode) return null

    let nextCursor: string | undefined
    let found: any = null

    // Paginate up to 5 pages (125 reels) to find by shortcode
    for (let page = 0; page < 5 && !found; page++) {
      const params = new URLSearchParams({
        fields: 'id,shortcode,media_type,timestamp,caption,like_count',
        limit: '25',
        access_token: igUserToken,
      })
      if (nextCursor) params.set('after', nextCursor)

      const mediaRes = await fetch(`${IG_GRAPH}/me/media?${params}`)
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

    // Fetch insights — `views` metric (current, replaces deprecated `plays`)
    let views = 0
    try {
      const insightsRes = await fetch(
        `${IG_GRAPH}/${found.id}/insights?metric=views&access_token=${igUserToken}`
      )
      const insightsData = (await insightsRes.json()) as any
      if (!insightsData.error) {
        const viewsMetric = insightsData.data?.find((m: any) => m.name === 'views')
        views = Number(viewsMetric?.total_value?.value ?? viewsMetric?.values?.[0]?.value ?? 0)
      }
      // Fallback to impressions if views is 0
      if (!views) {
        const impRes = await fetch(`${IG_GRAPH}/${found.id}/insights?metric=impressions&access_token=${igUserToken}`)
        const impData = (await impRes.json()) as any
        if (!impData.error) {
          const impMetric = impData.data?.find((m: any) => m.name === 'impressions')
          views = Number(impMetric?.total_value?.value ?? impMetric?.values?.[0]?.value ?? 0)
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

/** Fetch all reels for the picker UI, with eligibility flags */
export async function fetchEligibleReels(
  igUserToken: string,
  _igUserId: string,
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

  for (let page = 0; page < 4; page++) {
    const params = new URLSearchParams({
      fields: 'id,shortcode,media_type,timestamp,caption,like_count,thumbnail_url',
      limit: '25',
      access_token: igUserToken,
    })
    if (nextCursor) params.set('after', nextCursor)

    const res = await fetch(`${IG_GRAPH}/me/media?${params}`)
    const data = (await res.json()) as any
    if (data.error) { console.error('fetchEligibleReels error:', data.error); break }

    const items: any[] = (data.data || []).filter((m: any) => m.media_type === 'VIDEO')

    for (const item of items) {
      const postedAt = item.timestamp ? new Date(item.timestamp) : null
      const dateOk = postedAt !== null && postedAt >= collabJoinedAt
      const captionOk = captionMentionsNefol(item.caption)

      let views = 0
      try {
        const iRes = await fetch(`${IG_GRAPH}/${item.id}/insights?metric=views&access_token=${igUserToken}`)
        const iData = (await iRes.json()) as any
        if (!iData.error) {
          const m = iData.data?.find((d: any) => d.name === 'views')
          views = Number(m?.total_value?.value ?? m?.values?.[0]?.value ?? 0)
        }
        if (!views) {
          const iRes2 = await fetch(`${IG_GRAPH}/${item.id}/insights?metric=impressions&access_token=${igUserToken}`)
          const iData2 = (await iRes2.json()) as any
          if (!iData2.error) {
            const m = iData2.data?.find((d: any) => d.name === 'impressions')
            views = Number(m?.total_value?.value ?? m?.values?.[0]?.value ?? 0)
          }
        }
      } catch { /* non-fatal */ }

      results.push({
        media_id: item.id,
        shortcode: item.shortcode || '',
        reel_url: `https://www.instagram.com/reel/${item.shortcode}/`,
        thumbnail_url: item.thumbnail_url || null,
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

/** Read the stored IG user token for a collab from DB */
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

// ═══════════════════════ Admin brand Instagram (NEFOL official account) ═══

export async function getAdminBrandRow(pool: Pool) {
  const { rows } = await pool.query(
    `SELECT instagram_connected, ig_username, ig_user_id, fb_page_access_token, token_expires_at, token_updated_at, updated_at
     FROM admin_brand_instagram WHERE id = 1`
  )
  return rows[0] || null
}

/** GET /api/admin/instagram/connect?token=staff_… — browser redirect; validates staff session then sends user to Meta OAuth. */
export async function handleAdminBrandConnect(pool: Pool, req: Request, res: Response) {
  const token = String(req.query.token || '').trim()
  if (!token.startsWith('staff_')) {
    return res.status(401).send('Sign in to the admin panel first, then use Connect Instagram from Facebook & Instagram.')
  }
  const ctx = await getStaffContextByToken(pool, token)
  if (!ctx) {
    return res.status(401).send('Invalid or expired admin session. Please sign in again.')
  }

  const appId = process.env.INSTAGRAM_APP_ID || process.env.META_GRAPH_APP_ID || process.env.META_APP_ID
  if (!appId) return res.status(500).send('META_GRAPH_APP_ID / INSTAGRAM_APP_ID not configured')

  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 2000}`
  const redirectUri = `${backendUrl}/api/instagram/callback`
  const scope = ['instagram_business_basic', 'instagram_business_manage_insights'].join(',')

  const oauthUrl =
    `${IG_OAUTH}/oauth/authorize?` +
    `client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&response_type=code` +
    `&state=${encodeURIComponent(ADMIN_BRAND_OAUTH_STATE)}`

  console.log('🔗 Admin brand Instagram OAuth redirect')
  return res.redirect(oauthUrl)
}

export async function handleAdminBrandStatus(pool: Pool, _req: Request, res: Response) {
  try {
    const row = await getAdminBrandRow(pool)
    if (!row) {
      return res.json({
        connected: false,
        ig_username: null,
        ig_user_id: null,
        token_expires_at: null,
      })
    }
    return res.json({
      connected: !!row.instagram_connected,
      ig_username: row.ig_username || null,
      ig_user_id: row.ig_user_id || null,
      token_expires_at: row.token_expires_at || null,
      token_updated_at: row.token_updated_at || null,
    })
  } catch (e) {
    console.error('handleAdminBrandStatus:', e)
    return res.status(500).json({ message: 'Failed to load status' })
  }
}

export async function handleAdminBrandDisconnect(pool: Pool, _req: Request, res: Response) {
  try {
    await pool.query(
      `UPDATE admin_brand_instagram SET
        instagram_connected = false,
        fb_user_access_token = NULL,
        fb_page_access_token = NULL,
        ig_user_id = NULL,
        ig_username = NULL,
        token_expires_at = NULL,
        token_updated_at = NULL,
        updated_at = NOW()
       WHERE id = 1`
    )
    return res.json({ ok: true, message: 'Instagram disconnected' })
  } catch (e) {
    console.error('handleAdminBrandDisconnect:', e)
    return res.status(500).json({ message: 'Failed to disconnect' })
  }
}

export async function handleAdminBrandReels(pool: Pool, _req: Request, res: Response) {
  try {
    const row = await getAdminBrandRow(pool)
    if (!row?.instagram_connected || !row.fb_page_access_token || !row.ig_user_id) {
      return res.status(403).json({ message: 'Instagram not connected for brand account.' })
    }
    const token = row.fb_page_access_token as string
    const igUserId = String(row.ig_user_id)
    const since = new Date(0)
    const reels = await fetchEligibleReels(token, igUserId, since)
    return res.json({
      reels,
      nefol_keywords: NEFOL_KEYWORDS.filter((k) => k.startsWith('#')),
    })
  } catch (e) {
    console.error('handleAdminBrandReels:', e)
    return res.status(500).json({ message: 'Failed to fetch reels' })
  }
}

export async function handleAdminBrandDashboard(pool: Pool, _req: Request, res: Response) {
  try {
    const row = await getAdminBrandRow(pool)
    const connected = !!(row?.instagram_connected && row?.fb_page_access_token && row?.ig_user_id)

    let reels: Awaited<ReturnType<typeof fetchEligibleReels>> = []
    if (connected) {
      reels = await fetchEligibleReels(row!.fb_page_access_token as string, String(row!.ig_user_id), new Date(0))
    }

    const topCollabs = await pool.query(`
      SELECT
        ca.id,
        ca.name,
        ca.email,
        ca.ig_username,
        ca.instagram_connected,
        COUNT(cr.id)::int AS reel_count,
        COALESCE(SUM(cr.views_count), 0)::bigint AS total_views,
        COALESCE(SUM(cr.likes_count), 0)::bigint AS total_likes
      FROM collab_applications ca
      LEFT JOIN collab_reels cr ON cr.collab_application_id = ca.id
        AND (cr.platform = 'instagram' OR cr.platform IS NULL)
      WHERE ca.status = 'approved'
      GROUP BY ca.id, ca.name, ca.email, ca.ig_username, ca.instagram_connected
      ORDER BY COALESCE(SUM(cr.views_count), 0) DESC NULLS LAST
      LIMIT 15
    `)

    const summary = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM collab_applications WHERE status = 'approved' AND instagram_connected = true) AS creators_with_ig,
        (SELECT COUNT(*)::int FROM collab_reels WHERE platform = 'instagram' OR platform IS NULL) AS collab_reels_tracked,
        (SELECT COALESCE(SUM(views_count), 0)::bigint FROM collab_reels WHERE platform = 'instagram' OR platform IS NULL) AS collab_total_views
    `)

    const s = summary.rows[0] || {}

    return res.json({
      brand: {
        connected,
        ig_username: row?.ig_username || null,
        ig_user_id: row?.ig_user_id || null,
        token_expires_at: row?.token_expires_at || null,
      },
      reels: reels.slice(0, 60),
      reel_totals: {
        count: reels.length,
        views: reels.reduce((a, r) => a + (r.views || 0), 0),
        likes: reels.reduce((a, r) => a + (r.likes || 0), 0),
      },
      top_collabs: topCollabs.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        ig_username: r.ig_username,
        instagram_connected: r.instagram_connected,
        reel_count: Number(r.reel_count) || 0,
        total_views: Number(r.total_views) || 0,
        total_likes: Number(r.total_likes) || 0,
      })),
      summary: {
        creators_with_ig: Number(s.creators_with_ig) || 0,
        collab_reels_tracked: Number(s.collab_reels_tracked) || 0,
        collab_total_views: Number(s.collab_total_views) || 0,
      },
    })
  } catch (e) {
    console.error('handleAdminBrandDashboard:', e)
    return res.status(500).json({ message: 'Failed to load dashboard' })
  }
}

async function upsertAdminBrandInstagram(
  pool: Pool,
  igUserToken: string,
  igUserId: string,
  igUsername: string,
  tokenExpiresAt: Date
) {
  await pool.query(
    `INSERT INTO admin_brand_instagram (
      id, instagram_connected, fb_user_access_token, fb_page_access_token, ig_user_id, ig_username,
      token_expires_at, token_updated_at, updated_at
    ) VALUES (
      1, true, $1, $1, $2, $3, $4, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      instagram_connected = true,
      fb_user_access_token = EXCLUDED.fb_user_access_token,
      fb_page_access_token = EXCLUDED.fb_page_access_token,
      ig_user_id = EXCLUDED.ig_user_id,
      ig_username = EXCLUDED.ig_username,
      token_expires_at = EXCLUDED.token_expires_at,
      token_updated_at = NOW(),
      updated_at = NOW()`,
    [igUserToken, igUserId, igUsername, tokenExpiresAt]
  )
}

async function handleCallbackAdminBrand(
  pool: Pool,
  _req: Request,
  res: Response,
  code: string,
  backendUrl: string,
  adminUrl: string
) {
  try {
    const redirectUri = `${backendUrl}/api/instagram/callback`

    const tokenBody = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID || process.env.META_GRAPH_APP_ID || process.env.META_APP_ID || '',
      client_secret: process.env.INSTAGRAM_APP_SECRET || process.env.META_GRAPH_APP_SECRET || process.env.META_APP_SECRET || '',
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    })

    const tokenRes = await fetch(`${IG_OAUTH}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    })
    const tokenData = (await tokenRes.json()) as any

    if (tokenData.error_type || !tokenData.access_token) {
      console.error('IG token exchange error (admin brand):', tokenData)
      return res.redirect(
        `${adminUrl}/#/admin/facebook?ig_error=${encodeURIComponent('Token exchange failed. Please try again.')}`
      )
    }

    const shortToken: string = tokenData.access_token
    const igUserIdFromToken: string = String(tokenData.user_id || '')

    const longTokenData = await exchangeForLongLivedToken(shortToken)
    const igUserToken = longTokenData?.access_token || shortToken
    const expiresIn = longTokenData?.expires_in || 3600
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

    const profileRes = await fetch(
      `${IG_GRAPH}/me?fields=user_id,username,account_type&access_token=${igUserToken}`
    )
    const profile = (await profileRes.json()) as any

    if (profile.error) {
      console.error('IG profile fetch error (admin brand):', profile.error)
      return res.redirect(
        `${adminUrl}/#/admin/facebook?ig_error=${encodeURIComponent(
          'Could not read Instagram profile. Use a Creator or Business Instagram account.'
        )}`
      )
    }

    const igUserId: string = String(profile.user_id || igUserIdFromToken)
    const igUsername: string = profile.username || ''
    const accountType: string = (profile.account_type || '').toLowerCase()

    if (accountType === 'personal') {
      return res.redirect(
        `${adminUrl}/#/admin/facebook?ig_error=${encodeURIComponent(
          'Personal Instagram accounts cannot be used. Switch to Professional (Creator or Business) in Instagram settings.'
        )}`
      )
    }

    await upsertAdminBrandInstagram(pool, igUserToken, igUserId, igUsername, tokenExpiresAt)
    console.log(`✅ Admin brand Instagram connected: @${igUsername} (${accountType})`)
    return res.redirect(`${adminUrl}/#/admin/facebook?ig_connected=1`)
  } catch (err) {
    console.error('Instagram admin brand callback error:', err)
    return res.redirect(
      `${adminUrl}/#/admin/facebook?ig_error=${encodeURIComponent('Connection failed. Please try again.')}`
    )
  }
}

// ═══════════════════════ Route Handlers ═══════════════════════════════════════

export async function handleConnect(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query as Record<string, string>
  if (!collab_id) return res.status(400).send('collab_id is required')

  const blocked = await assertCollabNotBlockedByAppId(pool, collab_id)
  if (!blocked.ok) {
    const frontendUrl =
      process.env.USER_PANEL_URL || process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'http://localhost:2001'
    return res.redirect(
      `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent(blocked.message || 'Creator Collab access is restricted.')}`
    )
  }

  // Use Instagram-specific App ID if configured, then Graph app, then legacy fallback
  const appId = process.env.INSTAGRAM_APP_ID || process.env.META_GRAPH_APP_ID || process.env.META_APP_ID
  if (!appId) return res.status(500).send('META_GRAPH_APP_ID / INSTAGRAM_APP_ID not configured')

  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 2000}`
  const redirectUri = `${backendUrl}/api/instagram/callback`

  // Scopes for direct Instagram login (no Facebook Page needed)
  // Redirect URI goes under: Meta App → Instagram → API setup with Instagram login
  const scope = ['instagram_business_basic', 'instagram_business_manage_insights'].join(',')

  const oauthUrl =
    `${IG_OAUTH}/oauth/authorize?` +
    `client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&response_type=code` +
    `&state=${encodeURIComponent(collab_id)}`

  console.log('🔗 Instagram OAuth URL:', oauthUrl)
  console.log('   App ID used:', appId)
  console.log('   Redirect URI:', redirectUri)

  return res.redirect(oauthUrl)
}

export async function handleCallback(pool: Pool, req: Request, res: Response) {
  const { code, state: stateRaw, error, error_description } = req.query as Record<string, string>
  const stateStr = String(stateRaw || '')
  const isAdminBrand = stateStr === ADMIN_BRAND_OAUTH_STATE

  const frontendUrl = process.env.USER_PANEL_URL || process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'http://localhost:2001'
  const adminUrl = getAdminPanelBaseUrl()
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 2000}`

  if (error || !code) {
    console.error('Instagram OAuth error:', error, error_description)
    const errQ = encodeURIComponent(error_description || error || 'OAuth failed')
    if (isAdminBrand) {
      return res.redirect(`${adminUrl}/#/admin/facebook?ig_error=${errQ}`)
    }
    return res.redirect(`${frontendUrl}/#/user/collab?ig_error=${errQ}`)
  }

  if (isAdminBrand) {
    return handleCallbackAdminBrand(pool, req, res, String(code), backendUrl, adminUrl)
  }

  const collabId = stateStr

  try {
    const blocked = await assertCollabNotBlockedByAppId(pool, String(collabId))
    if (!blocked.ok) {
      return res.redirect(
        `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent(blocked.message || 'Creator Collab access is restricted.')}`
      )
    }

    const redirectUri = `${backendUrl}/api/instagram/callback`

    // Step 1: Exchange authorization code → short-lived IG user token
    const tokenBody = new URLSearchParams({
      client_id:     process.env.INSTAGRAM_APP_ID || process.env.META_GRAPH_APP_ID || process.env.META_APP_ID || '',
      client_secret: process.env.INSTAGRAM_APP_SECRET || process.env.META_GRAPH_APP_SECRET || process.env.META_APP_SECRET || '',
      grant_type:    'authorization_code',
      redirect_uri:  redirectUri,
      code,
    })

    const tokenRes = await fetch(`${IG_OAUTH}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    })
    const tokenData = (await tokenRes.json()) as any

    if (tokenData.error_type || !tokenData.access_token) {
      console.error('IG token exchange error:', tokenData)
      return res.redirect(
        `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent('Token exchange failed. Please try again.')}`
      )
    }

    const shortToken: string = tokenData.access_token
    const igUserIdFromToken: string = String(tokenData.user_id || '')

    // Step 2: Exchange → long-lived token (~60 days)
    const longTokenData = await exchangeForLongLivedToken(shortToken)
    const igUserToken = longTokenData?.access_token || shortToken
    const expiresIn   = longTokenData?.expires_in || 3600
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

    // Step 3: Fetch IG profile (username + account type)
    const profileRes = await fetch(
      `${IG_GRAPH}/me?fields=user_id,username,account_type&access_token=${igUserToken}`
    )
    const profile = (await profileRes.json()) as any

    if (profile.error) {
      console.error('IG profile fetch error:', profile.error)
      return res.redirect(
        `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent(
          'Could not read Instagram profile. Make sure your account is set to Creator or Business.'
        )}`
      )
    }

    const igUserId: string   = String(profile.user_id || igUserIdFromToken)
    const igUsername: string = profile.username || ''
    const accountType: string = (profile.account_type || '').toLowerCase()

    if (accountType === 'personal') {
      return res.redirect(
        `${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent(
          'Personal Instagram accounts cannot be used. In Instagram → Settings → Account → Switch to Professional Account (Creator).'
        )}`
      )
    }

    const cid = Number(collabId)
    const conflictMsg = await assertInstagramIdentityAvailableForCollab(pool, cid, igUserId, igUsername)
    if (conflictMsg) {
      return res.redirect(`${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent(conflictMsg)}`)
    }

    // Step 4: Store token
    // We store the IG user token in fb_page_access_token so existing fetchReelData / cron works unchanged
    try {
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
    } catch (dbErr: unknown) {
      const code = dbErr && typeof dbErr === 'object' && 'code' in dbErr ? (dbErr as { code: string }).code : ''
      if (code === '23505') {
        return res.redirect(`${frontendUrl}/#/user/collab?ig_error=${encodeURIComponent(IG_DUPLICATE_MSG)}`)
      }
      throw dbErr
    }

    console.log(`✅ Instagram connected for collab ${collabId}: @${igUsername} (${accountType})`)
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
      connected:        !!r.instagram_connected,
      ig_username:      r.ig_username || null,
      ig_user_id:       r.ig_user_id || null,
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
    const blocked = await assertCollabNotBlockedByAppId(pool, collab_id)
    if (!blocked.ok) return res.status(403).json({ message: blocked.message, collab_blocked: true })

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

export async function handleFetchReels(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query as Record<string, string>
  if (!collab_id) return res.status(400).json({ message: 'collab_id required' })

  try {
    const blocked = await assertCollabNotBlockedByAppId(pool, collab_id)
    if (!blocked.ok) return res.status(403).json({ message: blocked.message, collab_blocked: true })

    const { rows } = await pool.query(
      `SELECT instagram_connected, fb_page_access_token, ig_user_id, collab_joined_at, created_at, status
       FROM collab_applications WHERE id = $1`,
      [collab_id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Collab not found' })
    const app = rows[0]

    if (app.status !== 'approved') return res.status(403).json({ message: 'Collab not yet approved.' })
    if (!app.instagram_connected || !app.fb_page_access_token || !app.ig_user_id) {
      return res.status(403).json({ message: 'Instagram not connected.' })
    }

    const collabJoinedAt = new Date(app.collab_joined_at || app.created_at)

    const submittedRes = await pool.query(
      `SELECT reel_url FROM collab_reels WHERE collab_application_id = $1`,
      [collab_id]
    )
    const submittedUrls = new Set(submittedRes.rows.map((r: any) => r.reel_url))

    const reels = await fetchEligibleReels(app.fb_page_access_token, app.ig_user_id, collabJoinedAt)

    // Persist latest views/likes for already-submitted reels (user "sync" = live DB update)
    const { rows: igDbRows } = await pool.query(
      `SELECT reel_url FROM collab_reels WHERE collab_application_id = $1 AND platform = 'instagram'`,
      [collab_id]
    )
    const dbUrlByNorm = new Map<string, string>()
    for (const row of igDbRows) {
      dbUrlByNorm.set(normalizeCollabContentUrl(String((row as any).reel_url)), String((row as any).reel_url))
    }
    for (const r of reels) {
      const dbUrl = dbUrlByNorm.get(normalizeCollabContentUrl(r.reel_url))
      if (!dbUrl) continue
      await pool.query(
        `UPDATE collab_reels
         SET views_count = $1, likes_count = $2, caption = $3, caption_ok = $4, date_ok = $5,
             insights_pending = false, updated_at = NOW()
         WHERE collab_application_id = $6 AND reel_url = $7 AND platform = 'instagram'`,
        [r.views, r.likes, r.caption, r.caption_ok, r.date_ok, collab_id, dbUrl]
      )
    }

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

/**
 * Refresh long-lived IG tokens that expire within 7 days.
 * Called by cron — safe to run frequently (IG allows refreshing anytime after 24h).
 */
export async function refreshExpiringTokens(pool: Pool) {
  try {
    const { rows } = await pool.query(`
      SELECT id, fb_page_access_token
      FROM collab_applications
      WHERE instagram_connected = true
        AND fb_page_access_token IS NOT NULL
        AND token_expires_at IS NOT NULL
        AND token_expires_at < NOW() + INTERVAL '7 days'
    `)

    let refreshed = 0
    for (const row of rows) {
      try {
        const url = new URL(`${IG_GRAPH}/refresh_access_token`)
        url.searchParams.set('grant_type', 'ig_refresh_token')
        url.searchParams.set('access_token', row.fb_page_access_token)

        const res = await fetch(url.toString())
        const data = (await res.json()) as any
        if (data.error || !data.access_token) {
          console.warn(`Token refresh failed for collab ${row.id}:`, data.error?.message)
          continue
        }

        const newExpiry = new Date(Date.now() + (data.expires_in || 5184000) * 1000)
        await pool.query(
          `UPDATE collab_applications
           SET fb_page_access_token = $1,
               fb_user_access_token = $1,
               token_expires_at     = $2,
               token_updated_at     = NOW()
           WHERE id = $3`,
          [data.access_token, newExpiry, row.id]
        )
        refreshed++
      } catch (e) {
        console.warn(`Token refresh error for collab ${row.id}:`, e)
      }
    }

    if (refreshed > 0) console.log(`✅ Refreshed ${refreshed} expiring IG tokens`)

    const { rows: adminRows } = await pool.query(`
      SELECT id, fb_page_access_token
      FROM admin_brand_instagram
      WHERE id = 1 AND instagram_connected = true
        AND fb_page_access_token IS NOT NULL
        AND token_expires_at IS NOT NULL
        AND token_expires_at < NOW() + INTERVAL '7 days'
    `)
    for (const row of adminRows) {
      try {
        const url = new URL(`${IG_GRAPH}/refresh_access_token`)
        url.searchParams.set('grant_type', 'ig_refresh_token')
        url.searchParams.set('access_token', row.fb_page_access_token)

        const resFetch = await fetch(url.toString())
        const data = (await resFetch.json()) as any
        if (data.error || !data.access_token) {
          console.warn('Admin brand IG token refresh failed:', data.error?.message)
          continue
        }

        const newExpiry = new Date(Date.now() + (data.expires_in || 5184000) * 1000)
        await pool.query(
          `UPDATE admin_brand_instagram
           SET fb_page_access_token = $1,
               fb_user_access_token = $1,
               token_expires_at     = $2,
               token_updated_at     = NOW(),
               updated_at           = NOW()
           WHERE id = $3`,
          [data.access_token, newExpiry, row.id]
        )
        console.log('✅ Refreshed admin brand Instagram token')
      } catch (e) {
        console.warn('Admin brand IG token refresh error:', e)
      }
    }
  } catch (err) {
    console.error('refreshExpiringTokens error:', err)
  }
}

export default function instagramRouter(pool: Pool) {
  const router = Router()
  router.get('/connect',    (req, res) => handleConnect(pool, req, res))
  router.get('/callback',   (req, res) => handleCallback(pool, req, res))
  router.get('/status',     (req, res) => handleStatus(pool, req, res))
  router.post('/disconnect',(req, res) => handleDisconnect(pool, req, res))
  router.get('/reels',      (req, res) => handleFetchReels(pool, req, res))
  return router
}
