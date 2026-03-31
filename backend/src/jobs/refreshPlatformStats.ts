/**
 * Background job: refresh view/like stats for all submitted platform content.
 *
 * Runs every 2 hours. For each platform connection that has submitted content:
 *  1. Auto-refresh expired OAuth tokens (YouTube + Reddit)
 *  2. Re-fetch latest stats from the platform API
 *  3. Update collab_reels in-place (views_count, likes_count, updated_at)
 *  4. Anti-cheat: if a video/post disappears (deleted), flag it
 *
 * VK uses "offline" scope so tokens don't expire — no refresh needed.
 */
import { Pool } from 'pg'
import { mentionsNefol } from '../routes/platform'

// ─── Token refresh helpers ─────────────────────────────────────────────────────

async function refreshYoutubeToken(pool: Pool, connId: number, refreshToken: string): Promise<string | null> {
  try {
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
    const data: any = await r.json()
    if (!data.access_token) return null
    await pool.query(
      `UPDATE collab_platform_connections
       SET access_token = $1, token_expires_at = $2, updated_at = NOW()
       WHERE id = $3`,
      [data.access_token, data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null, connId]
    )
    return data.access_token
  } catch (err: any) {
    console.error('[PlatformStats] YouTube token refresh error:', err.message)
    return null
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
    if (!data.access_token) return null
    await pool.query(
      `UPDATE collab_platform_connections
       SET access_token = $1, token_expires_at = $2, updated_at = NOW()
       WHERE id = $3`,
      [data.access_token, data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null, connId]
    )
    return data.access_token
  } catch (err: any) {
    console.error('[PlatformStats] Reddit token refresh error:', err.message)
    return null
  }
}

/** Returns a live access token, refreshing if needed. Returns null if refresh fails. */
async function getLiveToken(pool: Pool, conn: any): Promise<string | null> {
  const { id, platform, access_token, refresh_token, token_expires_at } = conn
  // VK offline scope never expires
  if (platform === 'vk') return access_token
  // If token still valid with >5 min buffer, use it
  if (token_expires_at && new Date(token_expires_at) > new Date(Date.now() + 5 * 60 * 1000)) return access_token
  // Need refresh
  if (!refresh_token) return access_token // best-effort with potentially expired token
  if (platform === 'youtube') return await refreshYoutubeToken(pool, id, refresh_token)
  if (platform === 'reddit')  return await refreshRedditToken(pool, id, refresh_token)
  return access_token
}

// ─── Platform-specific stat fetchers ──────────────────────────────────────────

async function refreshYoutubeReels(pool: Pool, token: string, appId: number, reels: any[]) {
  // Extract YouTube video IDs from stored URLs
  const idMap: Record<string, number> = {} // videoId → reel.id
  for (const reel of reels) {
    const m = reel.reel_url.match(/[?&]v=([A-Za-z0-9_-]{11})/)
    if (m) idMap[m[1]] = reel.id
  }
  const videoIds = Object.keys(idMap)
  if (!videoIds.length) return

  // Batch by 50 (API limit)
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    try {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${batch.join(',')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data: any = await r.json()
      for (const v of (data.items || [])) {
        const views = parseInt(v.statistics?.viewCount || '0', 10)
        const likes = parseInt(v.statistics?.likeCount || '0', 10)
        const captionOk = mentionsNefol(v.snippet?.title) || mentionsNefol(v.snippet?.description)
        await pool.query(
          `UPDATE collab_reels
           SET views_count = $1, likes_count = $2, caption_ok = $3, updated_at = NOW()
           WHERE id = $4`,
          [views, likes, captionOk, idMap[v.id]]
        )
      }
      // Anti-cheat: any video ID not in response may have been deleted
      const returnedIds = new Set((data.items || []).map((v: any) => v.id))
      for (const vid of batch) {
        if (!returnedIds.has(vid)) {
          await pool.query(
            `UPDATE collab_reels SET content_status = 'flagged', updated_at = NOW() WHERE id = $1`,
            [idMap[vid]]
          )
          console.warn(`[PlatformStats] YouTube video ${vid} no longer accessible — flagged (app ${appId})`)
        }
      }
    } catch (err: any) {
      console.error('[PlatformStats] YouTube stats batch error:', err.message)
    }
  }
}

async function refreshRedditReels(pool: Pool, token: string, appId: number, reels: any[]) {
  for (const reel of reels) {
    try {
      // Extract post ID from reddit.com/r/.../comments/{id}/...
      const m = reel.reel_url.match(/\/comments\/([a-z0-9]+)\//i)
      if (!m) continue
      const postId = m[1]

      const r = await fetch(`https://oauth.reddit.com/api/info?id=t3_${postId}&raw_json=1`, {
        headers: { Authorization: `bearer ${token}`, 'User-Agent': 'NefolCollabApp/1.0' },
      })
      const data: any = await r.json()
      const post = data.data?.children?.[0]?.data
      if (!post) {
        // Post may have been deleted
        await pool.query(`UPDATE collab_reels SET content_status = 'flagged', updated_at = NOW() WHERE id = $1`, [reel.id])
        console.warn(`[PlatformStats] Reddit post ${postId} disappeared — flagged (app ${appId})`)
        continue
      }
      // Reddit: net upvotes as likes; views unreliable but store if available
      const likes = Math.max(0, post.score || 0)
      const views = typeof post.view_count === 'number' ? post.view_count : 0
      const captionOk = mentionsNefol(post.title) || mentionsNefol(post.selftext)
      await pool.query(
        `UPDATE collab_reels SET views_count = $1, likes_count = $2, caption_ok = $3, updated_at = NOW() WHERE id = $4`,
        [views, likes, captionOk, reel.id]
      )
    } catch (err: any) {
      console.error('[PlatformStats] Reddit reel refresh error:', err.message)
    }
  }
}

async function refreshVkReels(pool: Pool, token: string, appId: number, reels: any[]) {
  for (const reel of reels) {
    try {
      // Extract owner_id + video_id from vk.com/video{owner}_{id} or player URL
      const m = reel.reel_url.match(/video(-?\d+)_(\d+)/)
      if (!m) continue
      const [, ownerId, videoId] = m

      const r = await fetch(
        `https://api.vk.com/method/video.get?videos=${ownerId}_${videoId}&v=5.199&access_token=${token}`
      )
      const data: any = await r.json()
      const video = data.response?.items?.[0]
      if (!video) {
        await pool.query(`UPDATE collab_reels SET content_status = 'flagged', updated_at = NOW() WHERE id = $1`, [reel.id])
        console.warn(`[PlatformStats] VK video ${ownerId}_${videoId} disappeared — flagged (app ${appId})`)
        continue
      }
      const views = video.views || 0
      const likes = video.likes?.count || 0
      const captionOk = mentionsNefol(video.title) || mentionsNefol(video.description)
      await pool.query(
        `UPDATE collab_reels SET views_count = $1, likes_count = $2, caption_ok = $3, updated_at = NOW() WHERE id = $4`,
        [views, likes, captionOk, reel.id]
      )
    } catch (err: any) {
      console.error('[PlatformStats] VK reel refresh error:', err.message)
    }
  }
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function refreshAllPlatformStats(pool: Pool): Promise<void> {
  console.log('[PlatformStats] Starting background refresh...')
  const start = Date.now()

  try {
    // Only process connections that have submitted content (avoid useless API calls)
    const { rows: connections } = await pool.query(`
      SELECT DISTINCT pc.id, pc.collab_application_id, pc.platform,
             pc.access_token, pc.refresh_token, pc.platform_user_id, pc.platform_username,
             pc.token_expires_at
      FROM collab_platform_connections pc
      WHERE pc.access_token IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM collab_reels cr
          WHERE cr.collab_application_id = pc.collab_application_id
            AND cr.platform = pc.platform
            AND COALESCE(cr.content_status, 'auto') != 'rejected'
        )
    `)

    let totalUpdated = 0

    for (const conn of connections) {
      try {
        const token = await getLiveToken(pool, conn)
        if (!token) {
          console.warn(`[PlatformStats] No valid token for ${conn.platform} conn ${conn.id} — skipping`)
          continue
        }

        const { rows: reels } = await pool.query(
          `SELECT id, reel_url FROM collab_reels
           WHERE collab_application_id = $1 AND platform = $2
             AND COALESCE(content_status, 'auto') NOT IN ('rejected', 'flagged')`,
          [conn.collab_application_id, conn.platform]
        )
        if (!reels.length) continue

        if (conn.platform === 'youtube') await refreshYoutubeReels(pool, token, conn.collab_application_id, reels)
        else if (conn.platform === 'reddit') await refreshRedditReels(pool, token, conn.collab_application_id, reels)
        else if (conn.platform === 'vk') await refreshVkReels(pool, token, conn.collab_application_id, reels)

        totalUpdated += reels.length
      } catch (err: any) {
        console.error(`[PlatformStats] Error processing conn ${conn.id} (${conn.platform}):`, err.message)
      }
    }

    console.log(`[PlatformStats] Done — ${totalUpdated} items refreshed across ${connections.length} connections in ${Date.now() - start}ms`)
  } catch (err: any) {
    console.error('[PlatformStats] Fatal error:', err.message)
  }
}
