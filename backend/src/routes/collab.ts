// Collab Program Routes - Collab form + reel submission → progress toward Affiliate
import { Request, Response } from 'express'
import { Pool } from 'pg'

const AFFILIATE_THRESHOLD_VIEWS = 1000
const AFFILIATE_THRESHOLD_LIKES = 100

// Submit collab application (no auth required - same as affiliate)
export async function submitCollabApplication(pool: Pool, req: Request, res: Response) {
  try {
    const {
      name,
      email,
      phone,
      instagram,
      youtube,
      facebook,
      followers,
      message,
      agreeTerms,
    } = req.body

    if (!name || !email || !phone || !agreeTerms) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' })
    }

    const hasSocial = (instagram || '').trim() || (youtube || '').trim() || (facebook || '').trim()
    if (!hasSocial) {
      return res.status(400).json({ message: 'At least one social media handle (Instagram, YouTube, or Facebook) is required' })
    }

    const { rows } = await pool.query(
      `INSERT INTO collab_applications (name, email, phone, instagram, youtube, facebook, followers, message, agree_terms, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING id, email, status, created_at`,
      [
        name,
        email,
        phone,
        (instagram || '').trim() || null,
        (youtube || '').trim() || null,
        (facebook || '').trim() || null,
        followers || null,
        message || null,
        !!agreeTerms,
      ]
    )

    return res.status(201).json({ application: rows[0], message: 'Collab application submitted. We will reach out on Instagram for your collab video!' })
  } catch (err) {
    console.error('Collab application error:', err)
    return res.status(500).json({ message: 'Failed to submit application' })
  }
}

// Check collab status by email (for returning users)
export async function getCollabStatus(pool: Pool, req: Request, res: Response) {
  try {
    const { email } = req.query
    if (!email || typeof email !== 'string') {
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
    const progress = Math.min(
      100,
      ((totalViews / AFFILIATE_THRESHOLD_VIEWS) * 50 + (totalLikes / AFFILIATE_THRESHOLD_LIKES) * 50)
    )
    const affiliateUnlocked = totalViews >= AFFILIATE_THRESHOLD_VIEWS && totalLikes >= AFFILIATE_THRESHOLD_LIKES

    return res.json({
      id: app.id,
      email: app.email,
      instagram: app.instagram,
      status: app.status,
      created_at: app.created_at,
      total_views: totalViews,
      total_likes: totalLikes,
      progress: Math.round(progress),
      affiliate_unlocked: affiliateUnlocked,
      threshold_views: AFFILIATE_THRESHOLD_VIEWS,
      threshold_likes: AFFILIATE_THRESHOLD_LIKES,
    })
  } catch (err) {
    console.error('Collab status error:', err)
    return res.status(500).json({ message: 'Failed to fetch status' })
  }
}

// Submit reel link - verify + fetch views/likes
export async function submitReelLink(pool: Pool, req: Request, res: Response) {
  try {
    const { collab_id, reel_url, instagram_handle } = req.body

    if (!collab_id || !reel_url) {
      return res.status(400).json({ message: 'Collab ID and reel URL required' })
    }

    const url = String(reel_url).trim()
    if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
      return res.status(400).json({ message: 'Please provide a valid Instagram reel URL' })
    }

    const { rows } = await pool.query(
      'SELECT id, instagram FROM collab_applications WHERE id = $1',
      [collab_id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Collab application not found' })
    }

    const app = rows[0]
    const expectedHandle = (instagram_handle || app.instagram || '').trim().replace(/^@/, '').toLowerCase()

    // Check for duplicate reel
    const dup = await pool.query(
      'SELECT id FROM collab_reels WHERE collab_application_id = $1 AND reel_url = $2',
      [collab_id, url]
    )
    if (dup.rows.length > 0) {
      return res.status(409).json({ message: 'This reel has already been submitted' })
    }

    // TODO: Integrate real Instagram API / scraper for views and likes.
    // For now, use placeholder - you can replace with Apify, RapidAPI, or Instagram Graph API.
    const mockViews = Math.floor(Math.random() * 500) + 100
    const mockLikes = Math.floor(mockViews * (0.02 + Math.random() * 0.08))

    await pool.query(
      `INSERT INTO collab_reels (collab_application_id, reel_url, instagram_username, views_count, likes_count, verified)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [collab_id, url, expectedHandle || null, mockViews, mockLikes, !!expectedHandle]
    )

    const sumRes = await pool.query(
      `SELECT COALESCE(SUM(views_count), 0)::int AS v, COALESCE(SUM(likes_count), 0)::int AS l
       FROM collab_reels WHERE collab_application_id = $1`,
      [collab_id]
    )
    const totalViews = sumRes.rows[0]?.v || 0
    const totalLikes = sumRes.rows[0]?.l || 0
    const progress = Math.min(
      100,
      ((totalViews / AFFILIATE_THRESHOLD_VIEWS) * 50 + (totalLikes / AFFILIATE_THRESHOLD_LIKES) * 50)
    )
    const affiliateUnlocked = totalViews >= AFFILIATE_THRESHOLD_VIEWS && totalLikes >= AFFILIATE_THRESHOLD_LIKES

    return res.status(201).json({
      message: 'Reel submitted! Views and likes will be used to unlock the Affiliate program.',
      total_views: totalViews,
      total_likes: totalLikes,
      progress: Math.round(progress),
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
       JOIN collab_reels cr ON cr.collab_application_id = ca.id
       WHERE LOWER(ca.email) = LOWER($1)`,
      [email]
    )

    if (rows.length === 0) {
      return res.json({ unlocked: false })
    }

    const v = rows[0]?.v || 0
    const l = rows[0]?.l || 0
    const unlocked = v >= AFFILIATE_THRESHOLD_VIEWS && l >= AFFILIATE_THRESHOLD_LIKES
    return res.json({ unlocked })
  } catch (err) {
    console.error('Check affiliate unlocked:', err)
    return res.json({ unlocked: false })
  }
}
