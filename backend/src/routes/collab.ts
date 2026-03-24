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

async function resolveUniqueUserId(pool: Pool, req: Request): Promise<{ uniqueUserId: string | null; email: string | null }> {
  const token = req.headers.authorization?.replace('Bearer ', '').trim() || ''
  const parts = token.split('_')

  let uniqueUserId: string | null = null
  let email: string | null = null

  if (parts.length >= 3 && parts[0] === 'user' && parts[1] === 'token') {
    const numericId = parts[2]
    const userRes = await pool.query('SELECT email, unique_user_id FROM users WHERE id = $1 LIMIT 1', [numericId])
    email = userRes.rows[0]?.email || null
    uniqueUserId = userRes.rows[0]?.unique_user_id || null
  }

  // Fall back to query param email if no token
  if (!email) {
    const queryEmail = req.query?.email
    if (typeof queryEmail === 'string' && queryEmail.trim()) {
      email = queryEmail.trim()
    }
  }

  return { uniqueUserId, email }
}

async function resolveEmail(pool: Pool, req: Request): Promise<string | null> {
  const { email } = await resolveUniqueUserId(pool, req)
  return email
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

    // Extract unique_user_id from auth token
    const token = req.headers.authorization?.replace('Bearer ', '').trim() || ''
    const parts = token.split('_')
    let uniqueUserId: string | null = null
    if (parts.length >= 3 && parts[0] === 'user' && parts[1] === 'token') {
      const numericId = parts[2]
      const userRes = await pool.query('SELECT unique_user_id FROM users WHERE id = $1 LIMIT 1', [numericId])
      uniqueUserId = userRes.rows[0]?.unique_user_id || null
    }

    const storedInstagram = handles.join(',')
    const { rows } = await pool.query(
      `INSERT INTO collab_applications (name, email, phone, instagram, youtube, facebook, followers, message, agree_terms, status, unique_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
       RETURNING id, email, status, created_at, instagram`,
      [name, email, phone, storedInstagram, (youtube || '').trim() || null, (facebook || '').trim() || null, followers || null, message || null, !!agreeTerms, uniqueUserId]
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

// Check collab status by unique_user_id (primary) or email (fallback)
export async function getCollabStatus(pool: Pool, req: Request, res: Response) {
  try {
    const { uniqueUserId, email } = await resolveUniqueUserId(pool, req)

    if (!uniqueUserId && !email) {
      return res.status(400).json({ message: 'Authentication required' })
    }

    let rows: any[] = []

    if (uniqueUserId) {
      const result = await pool.query(
        `SELECT ca.id, ca.email, ca.instagram, COALESCE(ca.status, 'pending') AS status, ca.created_at,
                (SELECT COALESCE(SUM(views_count), 0)::int FROM collab_reels WHERE collab_application_id = ca.id) AS total_views,
                (SELECT COALESCE(SUM(likes_count), 0)::int FROM collab_reels WHERE collab_application_id = ca.id) AS total_likes
         FROM collab_applications ca
         WHERE ca.unique_user_id = $1
         ORDER BY ca.created_at DESC LIMIT 1`,
        [uniqueUserId]
      )
      rows = result.rows
    }

    // Fall back to email if no result by unique_user_id
    if (rows.length === 0 && email) {
      const result = await pool.query(
        `SELECT ca.id, ca.email, ca.instagram, COALESCE(ca.status, 'pending') AS status, ca.created_at,
                (SELECT COALESCE(SUM(views_count), 0)::int FROM collab_reels WHERE collab_application_id = ca.id) AS total_views,
                (SELECT COALESCE(SUM(likes_count), 0)::int FROM collab_reels WHERE collab_application_id = ca.id) AS total_likes
         FROM collab_applications ca
         WHERE LOWER(ca.email) = LOWER($1)
         ORDER BY ca.created_at DESC LIMIT 1`,
        [email]
      )
      rows = result.rows

      // Backfill unique_user_id on old records found by email
      if (rows.length > 0 && uniqueUserId) {
        await pool.query(
          `UPDATE collab_applications SET unique_user_id = $1 WHERE id = $2 AND unique_user_id IS NULL`,
          [uniqueUserId, rows[0].id]
        )
      }
    }

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

    const { rows } = await pool.query('SELECT id, instagram, status FROM collab_applications WHERE id = $1', [collab_id])
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Collab application not found' })
    }

    const app = rows[0]
    if (String(app.status || 'pending').toLowerCase() !== 'approved') {
      return res.status(403).json({ message: 'Collab request is pending admin approval. Reel tracking starts after approval.' })
    }
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

// ==================== ADMIN: Collab Management ====================
export async function getCollabApplications(pool: Pool, req: Request, res: Response) {
  try {
    const { status = 'all', page = 1, limit = 20, search = '' } = req.query as Record<string, string>
    const offset = (Number(page) - 1) * Number(limit)
    const clauses: string[] = []
    const params: any[] = []

    if (status && status !== 'all') {
      params.push(status)
      clauses.push(`ca.status = $${params.length}`)
    }

    if (search?.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`)
      clauses.push(`(
        LOWER(ca.name) LIKE $${params.length}
        OR LOWER(ca.email) LIKE $${params.length}
        OR LOWER(COALESCE(ca.instagram, '')) LIKE $${params.length}
      )`)
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    params.push(Number(limit))
    const limitParam = `$${params.length}`
    params.push(offset)
    const offsetParam = `$${params.length}`

    const query = `
      SELECT ca.*,
             COALESCE(SUM(cr.views_count), 0)::int AS total_views,
             COALESCE(SUM(cr.likes_count), 0)::int AS total_likes
      FROM collab_applications ca
      LEFT JOIN collab_reels cr ON cr.collab_application_id = ca.id
      ${whereSql}
      GROUP BY ca.id
      ORDER BY ca.created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `

    const rows = (await pool.query(query, params)).rows
    const mapped = rows.map((r: any) => ({
      ...r,
      instagram_handles: parseInstagramHandles(r.instagram),
    }))

    const countParams = params.slice(0, params.length - 2)
    const countWhere = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM collab_applications ca ${countWhere}`, countParams)

    return res.json({
      applications: mapped,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countRes.rows[0]?.total || 0,
        pages: Math.ceil((countRes.rows[0]?.total || 0) / Number(limit)),
      },
    })
  } catch (err) {
    console.error('getCollabApplications error:', err)
    return res.status(500).json({ message: 'Failed to fetch collab applications' })
  }
}

export async function getCollabApplication(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    const appRes = await pool.query('SELECT * FROM collab_applications WHERE id = $1', [id])
    if (appRes.rows.length === 0) return res.status(404).json({ message: 'Collab application not found' })

    const reelsRes = await pool.query(
      `SELECT id, reel_url, instagram_username, views_count, likes_count, verified, created_at
       FROM collab_reels WHERE collab_application_id = $1 ORDER BY created_at DESC`,
      [id]
    )

    return res.json({
      ...appRes.rows[0],
      instagram_handles: parseInstagramHandles(appRes.rows[0].instagram),
      reels: reelsRes.rows,
    })
  } catch (err) {
    console.error('getCollabApplication error:', err)
    return res.status(500).json({ message: 'Failed to fetch collab application' })
  }
}

export async function approveCollabApplication(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    const { adminNotes } = req.body || {}
    const result = await pool.query(
      `UPDATE collab_applications
       SET status = 'approved', admin_notes = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [adminNotes || null, id]
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'Collab application not found' })
    return res.json({ message: 'Collab application approved', application: result.rows[0] })
  } catch (err) {
    console.error('approveCollabApplication error:', err)
    return res.status(500).json({ message: 'Failed to approve collab application' })
  }
}

export async function rejectCollabApplication(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    const { rejectionReason } = req.body || {}
    if (!rejectionReason || !String(rejectionReason).trim()) {
      return res.status(400).json({ message: 'Rejection reason is required' })
    }
    const result = await pool.query(
      `UPDATE collab_applications
       SET status = 'rejected', rejection_reason = $1, rejected_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [String(rejectionReason).trim(), id]
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'Collab application not found' })
    return res.json({ message: 'Collab application rejected', application: result.rows[0] })
  } catch (err) {
    console.error('rejectCollabApplication error:', err)
    return res.status(500).json({ message: 'Failed to reject collab application' })
  }
}

// Check if user has unlocked affiliate (by unique_user_id or email - for Join Us modal)
export async function checkAffiliateUnlocked(pool: Pool, req: Request, res: Response) {
  try {
    const { uniqueUserId, email } = await resolveUniqueUserId(pool, req)
    const queryEmail = req.query?.email as string | undefined
    const resolvedEmail = email || queryEmail

    if (!uniqueUserId && !resolvedEmail) {
      return res.json({ unlocked: false })
    }

    let rows: any[] = []

    if (uniqueUserId) {
      const result = await pool.query(
        `SELECT COALESCE(SUM(cr.views_count), 0)::int AS v, COALESCE(SUM(cr.likes_count), 0)::int AS l
         FROM collab_applications ca
         LEFT JOIN collab_reels cr ON cr.collab_application_id = ca.id
         WHERE ca.unique_user_id = $1`,
        [uniqueUserId]
      )
      rows = result.rows
    }

    if ((!rows.length || (!rows[0]?.v && !rows[0]?.l)) && resolvedEmail) {
      const result = await pool.query(
        `SELECT COALESCE(SUM(cr.views_count), 0)::int AS v, COALESCE(SUM(cr.likes_count), 0)::int AS l
         FROM collab_applications ca
         LEFT JOIN collab_reels cr ON cr.collab_application_id = ca.id
         WHERE LOWER(ca.email) = LOWER($1)`,
        [resolvedEmail]
      )
      rows = result.rows
    }

    const v = rows[0]?.v || 0
    const l = rows[0]?.l || 0
    return res.json({ unlocked: v >= AFFILIATE_THRESHOLD_VIEWS && l >= AFFILIATE_THRESHOLD_LIKES })
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
