// Multi-platform OAuth + content sync routes
// Supports: YouTube (Google), Reddit, VK
import { Pool } from 'pg'
import { Request, Response, Router } from 'express'
import { assertCollabNotBlockedByAppId } from '../utils/collabBlocks'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Robust NEFOL mention check:
 * - Case-insensitive
 * - Normalises Unicode (catches lookalike chars)
 * - Strips zero-width / invisible formatting characters that could be used to hide text
 * - Matches both "nefol" and "neföl" (brand variants)
 */
export function mentionsNefol(text: string | null | undefined): boolean {
  if (!text) return false
  const cleaned = text
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '') // strip zero-width chars
    .normalize('NFKC') // normalise unicode variants (catches fullwidth, etc.)
    .toLowerCase()
  return /nef[oö]l/.test(cleaned)
}

/**
 * Stable key for matching a submitted `collab_reels.reel_url` to API "content_url" variants
 * (trailing slash, youtu.be vs watch, VK player vs permalink, etc.).
 */
export function normalizeCollabContentUrl(url: string): string {
  const s = String(url || '').trim()
  if (!s) return ''
  const lower = s.toLowerCase()
  const ig = lower.match(/instagram\.com\/(?:reel|p|tv)\/([^/?#]+)/)
  if (ig) return `ig:${ig[1]}`
  const yt = lower.match(/(?:[?&]v=|youtu\.be\/)([a-z0-9_-]{11})/i)
  if (yt) return `yt:${yt[1].toLowerCase()}`
  const vk = lower.match(/video(-?\d+)_(\d+)/)
  if (vk) return `vk:${vk[1]}_${vk[2]}`
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`)
    u.hash = ''
    let path = u.pathname.replace(/\/+$/, '') || '/'
    u.pathname = path
    return u.toString().toLowerCase()
  } catch {
    return lower.replace(/\/+$/, '')
  }
}

/** After fetching live content for the picker, persist latest views/likes for rows already in `collab_reels`. */
export async function syncSubmittedReelStatsFromContent(
  pool: Pool,
  collabId: string,
  platform: string,
  items: Array<{ content_url: string; views: number; likes: number; caption_ok: boolean; date_ok: boolean }>
) {
  const { rows } = await pool.query(
    `SELECT reel_url FROM collab_reels WHERE collab_application_id = $1 AND platform = $2`,
    [collabId, platform]
  )
  if (!rows.length || !items.length) return

  const dbUrlByNorm = new Map<string, string>()
  for (const row of rows) {
    const ru = String((row as any).reel_url || '')
    dbUrlByNorm.set(normalizeCollabContentUrl(ru), ru)
  }

  for (const item of items) {
    const dbUrl = dbUrlByNorm.get(normalizeCollabContentUrl(item.content_url))
    if (!dbUrl) continue
    await pool.query(
      `UPDATE collab_reels
       SET views_count = $1,
           likes_count = $2,
           caption_ok = $3,
           date_ok = $4,
           insights_pending = false,
           updated_at = NOW()
       WHERE collab_application_id = $5 AND reel_url = $6 AND platform = $7`,
      [item.views, item.likes, item.caption_ok, item.date_ok, collabId, dbUrl, platform]
    )
  }
}

function getFrontendUrl(): string {
  return process.env.USER_PANEL_URL || process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'http://localhost:2001'
}

async function getPlatformConnection(pool: Pool, collabId: string, platform: string) {
  const r = await pool.query(
    `SELECT pc.*, ca.collab_joined_at
     FROM collab_platform_connections pc
     JOIN collab_applications ca ON ca.id = pc.collab_application_id
     WHERE pc.collab_application_id = $1 AND pc.platform = $2`,
    [collabId, platform]
  )
  return r.rows[0] || null
}

async function upsertConnection(pool: Pool, collabId: string | number, platform: string, data: {
  access_token: string; refresh_token?: string | null
  platform_user_id?: string | null; platform_username?: string | null
  token_expires_at?: string | null
}) {
  await pool.query(`
    INSERT INTO collab_platform_connections
      (collab_application_id, platform, access_token, refresh_token, platform_user_id, platform_username, token_expires_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (collab_application_id, platform)
    DO UPDATE SET
      access_token     = EXCLUDED.access_token,
      refresh_token    = COALESCE(EXCLUDED.refresh_token, collab_platform_connections.refresh_token),
      platform_user_id = COALESCE(EXCLUDED.platform_user_id, collab_platform_connections.platform_user_id),
      platform_username= COALESCE(EXCLUDED.platform_username, collab_platform_connections.platform_username),
      token_expires_at = EXCLUDED.token_expires_at,
      updated_at       = NOW()
  `, [collabId, platform, data.access_token, data.refresh_token ?? null,
      data.platform_user_id ?? null, data.platform_username ?? null, data.token_expires_at ?? null])
}

async function getSubmittedUrls(pool: Pool, collabId: string, platform: string): Promise<Set<string>> {
  const r = await pool.query(
    `SELECT reel_url FROM collab_reels WHERE collab_application_id = $1 AND platform = $2`,
    [collabId, platform]
  )
  return new Set(r.rows.map((x: any) => x.reel_url))
}

// ═══════════════════════════════════════════════════════════════════════════════
// YOUTUBE (Google OAuth)
// ═══════════════════════════════════════════════════════════════════════════════

export async function connectYoutube(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query
  if (collab_id) {
    const blocked = await assertCollabNotBlockedByAppId(pool, String(collab_id))
    if (!blocked.ok) {
      const frontendUrl = getFrontendUrl()
      return res.redirect(`${frontendUrl}/#/user/collab?platform_error=youtube:${encodeURIComponent(blocked.message)}`)
    }
  }
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return res.status(500).send('GOOGLE_CLIENT_ID not configured')
  const redirectUri = `${process.env.BACKEND_URL}/api/platform/youtube/callback`
  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly')}` +
    `&response_type=code&access_type=offline&prompt=consent&state=${collab_id}`
  return res.redirect(url)
}

export async function callbackYoutube(pool: Pool, req: Request, res: Response) {
  const { code, state: collabId, error } = req.query as Record<string, string>
  const frontendUrl = getFrontendUrl()
  if (error || !code) return res.redirect(`${frontendUrl}/#/user/collab?platform_error=youtube:${encodeURIComponent(error || 'no_code')}`)
  try {
    if (collabId) {
      const blocked = await assertCollabNotBlockedByAppId(pool, collabId)
      if (!blocked.ok) {
        return res.redirect(`${frontendUrl}/#/user/collab?platform_error=youtube:${encodeURIComponent(blocked.message)}`)
      }
    }
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.BACKEND_URL}/api/platform/youtube/callback`,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData: any = await tokenRes.json()
    if (!tokenData.access_token) throw new Error(tokenData.error_description || 'No access token')

    // Get channel info
    const chanRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const chanData: any = await chanRes.json()
    const chan = chanData.items?.[0]

    await upsertConnection(pool, collabId, 'youtube', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      platform_user_id: chan?.id || null,
      platform_username: chan?.snippet?.title || null,
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
    })
    return res.redirect(`${frontendUrl}/#/user/collab?platform_connected=youtube`)
  } catch (err: any) {
    console.error('YouTube OAuth error:', err)
    return res.redirect(`${frontendUrl}/#/user/collab?platform_error=youtube:${encodeURIComponent(err.message)}`)
  }
}

async function refreshGoogleToken(refreshToken: string): Promise<any> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  return r.json()
}

export async function getYoutubeContent(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query as Record<string, string>
  if (!collab_id) return res.status(400).json({ message: 'collab_id required' })
  const blocked = await assertCollabNotBlockedByAppId(pool, collab_id)
  if (!blocked.ok) return res.status(403).json({ message: blocked.message, collab_blocked: true })
  const conn = await getPlatformConnection(pool, collab_id, 'youtube')
  if (!conn) return res.status(404).json({ message: 'YouTube not connected' })

  try {
    let token: string = conn.access_token
    // Auto-refresh expired token
    if (conn.token_expires_at && new Date(conn.token_expires_at) <= new Date() && conn.refresh_token) {
      const refreshed: any = await refreshGoogleToken(conn.refresh_token)
      if (refreshed.access_token) {
        token = refreshed.access_token
        await upsertConnection(pool, collab_id, 'youtube', {
          access_token: token,
          token_expires_at: refreshed.expires_in
            ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null,
        })
      }
    }

    const submittedSet = await getSubmittedUrls(pool, collab_id, 'youtube')

    // ── Step 1: Get the uploads playlist ID for this channel ──────────────
    // Using channels API (not search) guarantees we only get the user's own videos.
    const chanRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&mine=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const chanData: any = await chanRes.json()
    if (chanData.error) return res.status(400).json({ message: chanData.error.message || 'YouTube API error' })

    const uploadsPlaylistId: string | undefined = chanData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    if (!uploadsPlaylistId) return res.json({ content: [], platform: 'youtube', username: conn.platform_username })

    // ── Step 2: Page through the uploads playlist to collect all video IDs ─
    const videoIds: string[] = []
    let nextPageToken: string | undefined
    do {
      const plUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`
      const plRes = await fetch(plUrl, { headers: { Authorization: `Bearer ${token}` } })
      const plData: any = await plRes.json()
      if (plData.error) break
      for (const item of (plData.items || [])) {
        if (item.contentDetails?.videoId) videoIds.push(item.contentDetails.videoId)
      }
      nextPageToken = plData.nextPageToken
    } while (nextPageToken && videoIds.length < 200) // cap at 200 for sanity

    if (!videoIds.length) return res.json({ content: [], platform: 'youtube', username: conn.platform_username })

    // ── Step 3: Batch-fetch video statistics (50 per request) ─────────────
    const allVideos: any[] = []
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50)
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${batch.join(',')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const statsData: any = await statsRes.json()
      if (!statsData.error) allVideos.push(...(statsData.items || []))
    }

    const joinedAt = conn.collab_joined_at ? new Date(conn.collab_joined_at) : null

    const content = allVideos.map((v: any) => {
      const url = `https://www.youtube.com/watch?v=${v.id}`
      const published = v.snippet?.publishedAt ? new Date(v.snippet.publishedAt) : null
      const captionOk = mentionsNefol(v.snippet?.title) || mentionsNefol(v.snippet?.description)
      const dateOk = !joinedAt || (published !== null && published >= joinedAt)
      return {
        content_id: v.id, content_url: url,
        thumbnail_url: v.snippet?.thumbnails?.medium?.url || null,
        title: v.snippet?.title || null,
        description: v.snippet?.description?.slice(0, 200) || null,
        published_at: v.snippet?.publishedAt || null,
        views: parseInt(v.statistics?.viewCount || '0', 10),
        likes: parseInt(v.statistics?.likeCount || '0', 10),
        caption_ok: captionOk, date_ok: dateOk,
        eligible: captionOk && dateOk,
        already_submitted: submittedSet.has(url),
        platform_username: conn.platform_username || '',
      }
    })

    await syncSubmittedReelStatsFromContent(pool, collab_id, 'youtube', content)
    return res.json({ content, platform: 'youtube', username: conn.platform_username })
  } catch (err: any) {
    console.error('YouTube content error:', err)
    return res.status(500).json({ message: 'Failed to fetch YouTube content' })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REDDIT
// ═══════════════════════════════════════════════════════════════════════════════

export async function connectReddit(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query
  if (collab_id) {
    const blocked = await assertCollabNotBlockedByAppId(pool, String(collab_id))
    if (!blocked.ok) {
      const frontendUrl = getFrontendUrl()
      return res.redirect(`${frontendUrl}/#/user/collab?platform_error=reddit:${encodeURIComponent(blocked.message)}`)
    }
  }
  const clientId = process.env.REDDIT_CLIENT_ID
  if (!clientId) return res.status(500).send('REDDIT_CLIENT_ID not configured')
  const redirectUri = `${process.env.BACKEND_URL}/api/platform/reddit/callback`
  const url = `https://www.reddit.com/api/v1/authorize?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code&state=${collab_id}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&duration=permanent&scope=identity+read+history`
  return res.redirect(url)
}

export async function callbackReddit(pool: Pool, req: Request, res: Response) {
  const { code, state: collabId, error } = req.query as Record<string, string>
  const frontendUrl = getFrontendUrl()
  if (error || !code) return res.redirect(`${frontendUrl}/#/user/collab?platform_error=reddit:${encodeURIComponent(error || 'no_code')}`)
  try {
    if (collabId) {
      const blocked = await assertCollabNotBlockedByAppId(pool, collabId)
      if (!blocked.ok) {
        return res.redirect(`${frontendUrl}/#/user/collab?platform_error=reddit:${encodeURIComponent(blocked.message)}`)
      }
    }
    const clientId = process.env.REDDIT_CLIENT_ID!
    const clientSecret = process.env.REDDIT_CLIENT_SECRET!
    const redirectUri = `${process.env.BACKEND_URL}/api/platform/reddit/callback`

    const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'NefolCollabApp/1.0',
      },
      body: new URLSearchParams({ code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
    })
    const tokenData: any = await tokenRes.json()
    if (!tokenData.access_token) throw new Error(tokenData.error || 'No access token')

    const meRes = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: { Authorization: `bearer ${tokenData.access_token}`, 'User-Agent': 'NefolCollabApp/1.0' },
    })
    const meData: any = await meRes.json()

    await upsertConnection(pool, collabId, 'reddit', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      platform_user_id: String(meData.id || ''),
      platform_username: meData.name || null,
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
    })
    return res.redirect(`${frontendUrl}/#/user/collab?platform_connected=reddit`)
  } catch (err: any) {
    console.error('Reddit OAuth error:', err)
    return res.redirect(`${frontendUrl}/#/user/collab?platform_error=reddit:${encodeURIComponent(err.message)}`)
  }
}

async function refreshRedditToken(pool: Pool, connId: number, refreshToken: string): Promise<string | null> {
  try {
    const clientId = process.env.REDDIT_CLIENT_ID!
    const clientSecret = process.env.REDDIT_CLIENT_SECRET!
    const r = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'NefolCollabApp/1.0',
      },
      body: new URLSearchParams({ refresh_token: refreshToken, grant_type: 'refresh_token' }),
    })
    const data: any = await r.json()
    if (data.access_token) {
      await pool.query(
        `UPDATE collab_platform_connections SET access_token = $1, token_expires_at = $2, updated_at = NOW() WHERE id = $3`,
        [data.access_token, data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null, connId]
      )
      return data.access_token
    }
  } catch (err) { console.error('Reddit token refresh error:', err) }
  return null
}

export async function getRedditContent(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query as Record<string, string>
  if (!collab_id) return res.status(400).json({ message: 'collab_id required' })
  const blocked = await assertCollabNotBlockedByAppId(pool, collab_id)
  if (!blocked.ok) return res.status(403).json({ message: blocked.message, collab_blocked: true })
  const conn = await getPlatformConnection(pool, collab_id, 'reddit')
  if (!conn) return res.status(404).json({ message: 'Reddit not connected' })

  try {
    let token = conn.access_token
    // Auto-refresh if expired (Reddit tokens expire ~1h)
    if (conn.token_expires_at && new Date(conn.token_expires_at) <= new Date() && conn.refresh_token) {
      token = await refreshRedditToken(pool, conn.id, conn.refresh_token) || token
    }

    const submittedSet = await getSubmittedUrls(pool, collab_id, 'reddit')
    const username = conn.platform_username
    const postsRes = await fetch(
      `https://oauth.reddit.com/user/${username}/submitted?limit=100&sort=new&raw_json=1`,
      { headers: { Authorization: `bearer ${token}`, 'User-Agent': 'NefolCollabApp/1.0' } }
    )
    const postsData: any = await postsRes.json()
    // Reddit returns 401/403 object on auth failure
    if (postsData.error) return res.status(400).json({ message: postsData.message || 'Reddit API error. Try reconnecting.' })

    const joinedAt = conn.collab_joined_at ? new Date(conn.collab_joined_at) : null

    const content = ((postsData.data?.children || []) as any[]).map((child: any) => {
      const post = child.data
      const url = `https://www.reddit.com${post.permalink}`
      const created = post.created_utc ? new Date(post.created_utc * 1000) : null
      const captionOk = mentionsNefol(post.title) || mentionsNefol(post.selftext)
      const dateOk = !joinedAt || (created !== null && created >= joinedAt)
      return {
        content_id: post.id, content_url: url,
        thumbnail_url: post.thumbnail?.startsWith('http') ? post.thumbnail : null,
        title: post.title || null,
        // Reddit "views" are unreliable — we use net upvotes (score) as engagement metric
        description: `Score: ${post.score} upvotes · ${post.selftext?.slice(0, 120) || 'Link post'}`,
        published_at: created?.toISOString() || null,
        views: 0, // Reddit doesn't expose reliable view counts via API
        likes: Math.max(0, post.score || 0), // net upvotes used as engagement
        caption_ok: captionOk, date_ok: dateOk,
        eligible: captionOk && dateOk,
        already_submitted: submittedSet.has(url),
        platform_username: username || '',
        metric_note: 'Reddit: upvotes count as likes. Views not available via API.',
      }
    })

    await syncSubmittedReelStatsFromContent(pool, collab_id, 'reddit', content)
    return res.json({ content, platform: 'reddit', username, metric_note: 'Upvotes count toward likes milestone. Views not tracked for Reddit.' })
  } catch (err: any) {
    console.error('Reddit content error:', err)
    return res.status(500).json({ message: 'Failed to fetch Reddit content' })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VK
// ═══════════════════════════════════════════════════════════════════════════════

export async function connectVk(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query
  if (collab_id) {
    const blocked = await assertCollabNotBlockedByAppId(pool, String(collab_id))
    if (!blocked.ok) {
      const frontendUrl = getFrontendUrl()
      return res.redirect(`${frontendUrl}/#/user/collab?platform_error=vk:${encodeURIComponent(blocked.message)}`)
    }
  }
  const appId = process.env.VK_APP_ID
  if (!appId) return res.status(500).send('VK_APP_ID not configured')
  const redirectUri = `${process.env.BACKEND_URL}/api/platform/vk/callback`
  const url = `https://oauth.vk.com/authorize?` +
    `client_id=${encodeURIComponent(appId)}&display=page` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=video,wall,offline&response_type=code&v=5.199&state=${collab_id}`
  return res.redirect(url)
}

export async function callbackVk(pool: Pool, req: Request, res: Response) {
  const { code, state: collabId, error } = req.query as Record<string, string>
  const frontendUrl = getFrontendUrl()
  if (error || !code) return res.redirect(`${frontendUrl}/#/user/collab?platform_error=vk:${encodeURIComponent(error || 'no_code')}`)
  try {
    if (collabId) {
      const blocked = await assertCollabNotBlockedByAppId(pool, collabId)
      if (!blocked.ok) {
        return res.redirect(`${frontendUrl}/#/user/collab?platform_error=vk:${encodeURIComponent(blocked.message)}`)
      }
    }
    const redirectUri = `${process.env.BACKEND_URL}/api/platform/vk/callback`
    const tokenRes = await fetch(
      `https://oauth.vk.com/access_token?client_id=${process.env.VK_APP_ID}` +
      `&client_secret=${process.env.VK_APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    )
    const tokenData: any = await tokenRes.json()
    if (!tokenData.access_token) throw new Error(tokenData.error_description || 'No access token')

    // Fetch user name
    const userRes = await fetch(
      `https://api.vk.com/method/users.get?user_ids=${tokenData.user_id}&fields=screen_name&v=5.199&access_token=${tokenData.access_token}`
    )
    const userData: any = await userRes.json()
    const screenName = userData.response?.[0]?.screen_name || String(tokenData.user_id)

    await upsertConnection(pool, collabId, 'vk', {
      access_token: tokenData.access_token,
      platform_user_id: String(tokenData.user_id || ''),
      platform_username: screenName,
      token_expires_at: null, // offline scope → no expiry
    })
    return res.redirect(`${frontendUrl}/#/user/collab?platform_connected=vk`)
  } catch (err: any) {
    console.error('VK OAuth error:', err)
    return res.redirect(`${frontendUrl}/#/user/collab?platform_error=vk:${encodeURIComponent(err.message)}`)
  }
}

export async function getVkContent(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query as Record<string, string>
  if (!collab_id) return res.status(400).json({ message: 'collab_id required' })
  const blocked = await assertCollabNotBlockedByAppId(pool, collab_id)
  if (!blocked.ok) return res.status(403).json({ message: blocked.message, collab_blocked: true })
  const conn = await getPlatformConnection(pool, collab_id, 'vk')
  if (!conn) return res.status(404).json({ message: 'VK not connected' })

  try {
    const submittedSet = await getSubmittedUrls(pool, collab_id, 'vk')
    const joinedAt = conn.collab_joined_at ? new Date(conn.collab_joined_at) : null

    const videosRes = await fetch(
      `https://api.vk.com/method/video.get?owner_id=${conn.platform_user_id}&count=100&v=5.199&access_token=${conn.access_token}`
    )
    const videosData: any = await videosRes.json()
    if (videosData.error) return res.status(400).json({ message: videosData.error.error_msg || 'VK API error' })

    const content = ((videosData.response?.items || []) as any[]).map((video: any) => {
      const url = video.player || `https://vk.com/video${conn.platform_user_id}_${video.id}`
      const published = video.date ? new Date(video.date * 1000) : null
      const captionOk = mentionsNefol(video.title) || mentionsNefol(video.description)
      const dateOk = !joinedAt || (published !== null && published >= joinedAt)
      return {
        content_id: String(video.id), content_url: url,
        thumbnail_url: video.image?.[0]?.url || null,
        title: video.title || null,
        description: video.description?.slice(0, 200) || null,
        published_at: published?.toISOString() || null,
        views: video.views || 0,
        likes: video.likes?.count || 0,
        caption_ok: captionOk, date_ok: dateOk,
        eligible: captionOk && dateOk,
        already_submitted: submittedSet.has(url),
        platform_username: conn.platform_username || '',
      }
    })

    await syncSubmittedReelStatsFromContent(pool, collab_id, 'vk', content)
    return res.json({ content, platform: 'vk', username: conn.platform_username })
  } catch (err: any) {
    console.error('VK content error:', err)
    return res.status(500).json({ message: 'Failed to fetch VK content' })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPlatformConnections(pool: Pool, req: Request, res: Response) {
  const { collab_id } = req.query as Record<string, string>
  if (!collab_id) return res.status(400).json({ message: 'collab_id required' })
  const r = await pool.query(
    `SELECT platform, platform_username, platform_user_id, connected_at, token_expires_at
     FROM collab_platform_connections WHERE collab_application_id = $1`,
    [collab_id]
  )
  return res.json({ connections: r.rows })
}

export async function disconnectPlatform(pool: Pool, req: Request, res: Response) {
  const { platform } = req.params
  const { collab_id } = req.body
  if (!collab_id || !platform) return res.status(400).json({ message: 'collab_id and platform required' })
  const blocked = await assertCollabNotBlockedByAppId(pool, collab_id)
  if (!blocked.ok) return res.status(403).json({ message: blocked.message, collab_blocked: true })
  await pool.query(
    `DELETE FROM collab_platform_connections WHERE collab_application_id = $1 AND platform = $2`,
    [collab_id, platform]
  )
  return res.json({ message: `${platform} disconnected` })
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export default function createPlatformRouter(pool: Pool) {
  const router = Router()

  // YouTube
  router.get('/youtube/connect',  (req, res) => connectYoutube(pool, req, res))
  router.get('/youtube/callback', (req, res) => callbackYoutube(pool, req, res))
  router.get('/youtube/content',  (req, res) => getYoutubeContent(pool, req, res))

  // Reddit
  router.get('/reddit/connect',   (req, res) => connectReddit(pool, req, res))
  router.get('/reddit/callback',  (req, res) => callbackReddit(pool, req, res))
  router.get('/reddit/content',   (req, res) => getRedditContent(pool, req, res))

  // VK
  router.get('/vk/connect',       (req, res) => connectVk(pool, req, res))
  router.get('/vk/callback',      (req, res) => callbackVk(pool, req, res))
  router.get('/vk/content',       (req, res) => getVkContent(pool, req, res))

  // Shared
  router.get('/connections',      (req, res) => getPlatformConnections(pool, req, res))
  router.post('/disconnect/:platform', (req, res) => disconnectPlatform(pool, req, res))

  return router
}
