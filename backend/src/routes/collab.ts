import { Request, Response, Router } from 'express'
import { Pool } from 'pg'

const AFFILIATE_THRESHOLD_VIEWS = 1000
const AFFILIATE_THRESHOLD_LIKES = 100

function normalizeHandle(handle: string): string {
  return String(handle || '').trim().replace(/^@/, '').toLowerCase()
}

function parseInstagramHandles(instagram: string | null | undefined, instagramHandles?: string[]): string[] {
  const fromList = Array.isArray(instagramHandles) ? instagramHandles : []
  const fromSingle = String(instagram || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
  const merged = [...fromList, ...fromSingle].map(normalizeHandle).filter(Boolean)
  return Array.from(new Set(merged))
}

function computeProgress(totalViews: number, totalLikes: number) {
  const progress = Math.min(
    100,
    (totalViews / AFFILIATE_THRESHOLD_VIEWS) * 50 + (totalLikes / AFFILIATE_THRESHOLD_LIKES) * 50
  )
  const affiliateUnlocked = totalViews >= AFFILIATE_THRESHOLD_VIEWS && totalLikes >= AFFILIATE_THRESHOLD_LIKES
  return { progress: Math.round(progress), affiliateUnlocked }
}

async function resolveEmail(pool: Pool, req: Request): Promise<string | null> {
  const queryEmail = req.query?.email
  if (typeof queryEmail === 'string' && queryEmail.trim()) return queryEmail.trim()

  const token = req.headers.authorization?.replace('Bearer ', '').trim() || ''
  const parts = token.split('_')
  if (parts.length >= 3 && parts[0] === 'user' && parts[1] === 'token') {
    const userId = parts[2]
    const userRes = await pool.query('SELECT email FROM users WHERE id = $1 LIMIT 1', [userId])
    return userRes.rows[0]?.email || null
  }

  return null
}

// Submit collab application
export async function submitCollabApplication(pool: Pool, req: Request, res: Response) {
  try {
    const { name, email, phone, instagram, instagram_handles, youtube, facebook, followers, message, agreeTerms } = req.body

    if (!name || !email || !phone || !agreeTerms) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' })
    }

    const handles = parseInstagramHandles(instagram, instagram_handles)
    if (handles.length === 0) {
      return res.status(400).json({ message: 'At least one Instagram handle is required' })
    }

    const storedInstagram = handles.join(',')
    const { rows } = await pool.query(
      `INSERT INTO collab_applications (name, email, phone, instagram, youtube, facebook, followers, message, agree_terms, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING id, email, status, created_at, instagram`,
      [name, email, phone, storedInstagram, (youtube || '').trim() || null, (facebook || '').trim() || null, followers || null, message || null, !!agreeTerms]
    )

    return res.status(201).json({
      application: {
        ...rows[0],
        instagram_handles: handles,
      },
      message: 'Collab application submitted. You can now add reels from your listed Instagram accounts.',
    })
  } catch (err) {
    console.error('Collab application error:', err)
    return res.status(500).json({ message: 'Failed to submit application' })
  }
}

// Check collab status by email or auth token
export async function getCollabStatus(pool: Pool, req: Request, res: Response) {
  try {
    const email = await resolveEmail(pool, req)
    if (!email) {
      return res.status(400).json({ message: 'Email required' })
    }

    const { rows } = await pool.query(
      `SELECT ca.id, ca.email, ca.instagram, COALESCE(ca.status, 'pending') AS status, ca.created_at,
              (SELECT COALESCE(SUM(views_count), 0)::int FROM collab_reels WHERE collab_application_id = ca.id) AS total_views,
              (SELECT COALESCE(SUM(likes_count), 0)::int FROM collab_reels WHERE collab_application_id = ca.id) AS total_likes
       FROM collab_applications ca
       WHERE LOWER(ca.email) = LOWER($1)
       ORDER BY ca.created_at DESC LIMIT 1`,
      [email]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No collab application found' })
    }

    const app = rows[0]
    const totalViews = Number(app.total_views) || 0
    const totalLikes = Number(app.total_likes) || 0
    const { progress, affiliateUnlocked } = computeProgress(totalViews, totalLikes)

    const reelsRes = await pool.query(
      `SELECT id, reel_url, instagram_username, views_count, likes_count, verified, created_at
       FROM collab_reels
       WHERE collab_application_id = $1
       ORDER BY created_at DESC`,
      [app.id]
    )

    return res.json({
      id: app.id,
      email: app.email,
      instagram: app.instagram,
      instagram_handles: parseInstagramHandles(app.instagram),
      reels: reelsRes.rows,
      status: app.status,
      created_at: app.created_at,
      total_views: totalViews,
      total_likes: totalLikes,
      progress,
      affiliate_unlocked: affiliateUnlocked,
      threshold_views: AFFILIATE_THRESHOLD_VIEWS,
      threshold_likes: AFFILIATE_THRESHOLD_LIKES,
    })
  } catch (err) {
    console.error('Collab status error:', err)
    return res.status(500).json({ message: 'Failed to fetch status' })
  }
}

// Submit one or many reel links - verify handle belongs to listed handles
export async function submitReelLink(pool: Pool, req: Request, res: Response) {
  try {
    const { collab_id, reel_url, reel_urls, instagram_handle } = req.body

    if (!collab_id) {
      return res.status(400).json({ message: 'Collab ID required' })
    }

    const { rows } = await pool.query('SELECT id, instagram FROM collab_applications WHERE id = $1', [collab_id])
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Collab application not found' })
    }

    const app = rows[0]
    const allowedHandles = parseInstagramHandles(app.instagram)
    if (allowedHandles.length === 0) {
      return res.status(400).json({ message: 'No Instagram handles found for this collab application. Update your application first.' })
    }

    const incoming: Array<{ reel_url: string; instagram_handle?: string }> = Array.isArray(reel_urls)
      ? reel_urls
      : reel_url
      ? [{ reel_url, instagram_handle }]
      : []

    if (incoming.length === 0) {
      return res.status(400).json({ message: 'Please submit at least one reel URL' })
    }

    for (const item of incoming) {
      const url = String(item.reel_url || '').trim()
      const handle = normalizeHandle(item.instagram_handle || '')
      if (!url) return res.status(400).json({ message: 'Reel URL cannot be empty' })
      if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
        return res.status(400).json({ message: 'All submitted links must be valid Instagram reel URLs' })
      }
      if (!handle) return res.status(400).json({ message: 'Please choose Instagram handle for each reel' })
      if (!allowedHandles.includes(handle)) {
        return res.status(400).json({ message: `Reel handle @${handle} is not in your approved Instagram handles list` })
      }
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      for (const item of incoming) {
        const url = String(item.reel_url).trim()
        const handle = normalizeHandle(item.instagram_handle || '')

        const dup = await client.query(
          'SELECT id FROM collab_reels WHERE collab_application_id = $1 AND reel_url = $2',
          [collab_id, url]
        )
        if (dup.rows.length > 0) {
          await client.query('ROLLBACK')
          return res.status(409).json({ message: `This reel is already submitted: ${url}` })
        }

        // TODO: Replace with Instagram API data source in production.
        const mockViews = Math.floor(Math.random() * 500) + 100
        const mockLikes = Math.floor(mockViews * (0.02 + Math.random() * 0.08))

        await client.query(
          `INSERT INTO collab_reels (collab_application_id, reel_url, instagram_username, views_count, likes_count, verified)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [collab_id, url, handle, mockViews, mockLikes, true]
        )
      }

      await client.query('COMMIT')
    } catch (txErr) {
      await client.query('ROLLBACK')
      throw txErr
    } finally {
      client.release()
    }

    const sumRes = await pool.query(
      `SELECT COALESCE(SUM(views_count), 0)::int AS v, COALESCE(SUM(likes_count), 0)::int AS l
       FROM collab_reels WHERE collab_application_id = $1`,
      [collab_id]
    )
    const totalViews = sumRes.rows[0]?.v || 0
    const totalLikes = sumRes.rows[0]?.l || 0
    const { progress, affiliateUnlocked } = computeProgress(totalViews, totalLikes)

    return res.status(201).json({
      message: `${incoming.length} reel${incoming.length > 1 ? 's' : ''} submitted successfully`,
      submitted_count: incoming.length,
      total_views: totalViews,
      total_likes: totalLikes,
      progress,
      affiliate_unlocked: affiliateUnlocked,
    })
  } catch (err) {
    console.error('Reel submission error:', err)
    return res.status(500).json({ message: 'Failed to submit reel' })
  }
}

// Check if user has unlocked affiliate (by email - for Join Us modal)
export async function checkAffiliateUnlocked(pool: Pool, req: Request, res: Response) {
  try {
    const { email } = req.query
    if (!email || typeof email !== 'string') {
      return res.json({ unlocked: false })
    }

    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(cr.views_count), 0)::int AS v, COALESCE(SUM(cr.likes_count), 0)::int AS l
       FROM collab_applications ca
       LEFT JOIN collab_reels cr ON cr.collab_application_id = ca.id
       WHERE LOWER(ca.email) = LOWER($1)`,
      [email]
    )

    const v = rows[0]?.v || 0
    const l = rows[0]?.l || 0
    const unlocked = v >= AFFILIATE_THRESHOLD_VIEWS && l >= AFFILIATE_THRESHOLD_LIKES
    return res.json({ unlocked })
  } catch (err) {
    console.error('Check affiliate unlocked:', err)
    return res.json({ unlocked: false })
  }
}

export default function collabRouter(pool: Pool) {
  const router = Router()
  router.post('/apply', (req, res) => submitCollabApplication(pool, req, res))
  router.get('/status', (req, res) => getCollabStatus(pool, req, res))
  router.post('/submit-reel', (req, res) => submitReelLink(pool, req, res))
  router.get('/affiliate-unlocked', (req, res) => checkAffiliateUnlocked(pool, req, res))
  return router
}
