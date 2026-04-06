import { Pool } from 'pg'
import { Request, Response } from 'express'

const VALID_STATUS = new Set(['active', 'inactive', 'banned', 'deleted'])

function parseAuthorId(req: Request, res: Response): number | null {
  const n = parseInt(String(req.params.id), 10)
  if (!Number.isFinite(n) || n < 1) {
    res.status(400).json({ message: 'Invalid author id' })
    return null
  }
  return n
}

/**
 * Admin list: author_profiles + users + author_stats + blog aggregates.
 * Query: q, status (all|active|inactive|banned|deleted), onboarding (all|complete|incomplete),
 * role (all|author), sort (created_desc|followers_desc|posts_desc|name_asc), limit, offset
 */
export async function listAdminAuthors(pool: Pool | null, req: Request, res: Response) {
  if (!pool) return res.status(500).json({ message: 'Database not initialized' })
  try {
    const qRaw = String(req.query.q || '').trim()
    const status = String(req.query.status || 'all').toLowerCase()
    const onboarding = String(req.query.onboarding || 'all').toLowerCase()
    const roleFilter = String(req.query.role || 'all').toLowerCase()
    const sort = String(req.query.sort || 'created_desc').toLowerCase()
    const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 50, 1), 200)
    const offset = Math.max(parseInt(String(req.query.offset), 10) || 0, 0)

    const cond: string[] = ['1=1']
    const params: unknown[] = []

    if (status !== 'all' && VALID_STATUS.has(status)) {
      params.push(status)
      cond.push(`ap.status = $${params.length}`)
    }

    if (onboarding === 'complete') {
      cond.push(`ap.onboarding_completed = true`)
    } else if (onboarding === 'incomplete') {
      cond.push(`COALESCE(ap.onboarding_completed, false) = false`)
    }

    if (roleFilter === 'author') {
      cond.push(`'AUTHOR' = ANY(COALESCE(u.roles, ARRAY[]::text[]))`)
    }

    if (qRaw) {
      const like = `%${qRaw.toLowerCase()}%`
      params.push(like)
      const likeIdx = params.length
      params.push(qRaw)
      const exactIdx = params.length
      cond.push(`(
        LOWER(COALESCE(ap.display_name, '')) LIKE $${likeIdx}
        OR LOWER(COALESCE(ap.username, '')) LIKE $${likeIdx}
        OR LOWER(COALESCE(ap.pen_name, '')) LIKE $${likeIdx}
        OR LOWER(COALESCE(ap.email, '')) LIKE $${likeIdx}
        OR LOWER(COALESCE(u.email, '')) LIKE $${likeIdx}
        OR LOWER(COALESCE(u.name, '')) LIKE $${likeIdx}
        OR LOWER(COALESCE(ap.unique_user_id, '')) LIKE $${likeIdx}
        OR LOWER(COALESCE(u.unique_user_id, '')) LIKE $${likeIdx}
        OR CAST(ap.id AS TEXT) = $${exactIdx}
        OR CAST(ap.user_id AS TEXT) = $${exactIdx}
      )`)
    }

    const whereSql = cond.join(' AND ')

    let orderBy = 'ap.created_at DESC NULLS LAST'
    if (sort === 'followers_desc') {
      orderBy = 'COALESCE(ast.followers_count, 0) DESC, ap.created_at DESC NULLS LAST'
    } else if (sort === 'posts_desc') {
      orderBy = 'blog_posts_total DESC, ap.created_at DESC NULLS LAST'
    } else if (sort === 'name_asc') {
      orderBy =
        "LOWER(COALESCE(NULLIF(TRIM(ap.display_name), ''), NULLIF(TRIM(ap.username), ''), NULLIF(TRIM(ap.pen_name), ''), '')) ASC NULLS LAST"
    }

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM author_profiles ap
      LEFT JOIN users u ON u.id = ap.user_id
      LEFT JOIN author_stats ast ON ast.author_id = ap.id
      WHERE ${whereSql}
    `
    const { rows: countRows } = await pool.query(countQuery, params)
    const total = countRows[0]?.total ?? 0

    const listParams = [...params, limit, offset]
    const limitIdx = listParams.length - 1
    const offsetIdx = listParams.length

    const listQuery = `
      SELECT
        ap.id,
        ap.user_id,
        ap.username,
        ap.display_name,
        ap.pen_name,
        ap.email AS profile_email,
        ap.status,
        ap.is_verified,
        ap.onboarding_completed,
        ap.created_at,
        ap.updated_at,
        ap.profile_image,
        ap.unique_user_id AS profile_unique_user_id,
        u.email AS user_email,
        u.name AS user_name,
        u.unique_user_id AS user_unique_user_id,
        u.roles,
        u.member_since,
        COALESCE(ast.followers_count, 0) AS followers_count,
        COALESCE(ast.subscribers_count, 0) AS subscribers_count,
        COALESCE(ast.posts_count, 0) AS cached_posts_count,
        COALESCE(ast.total_views, 0) AS total_views,
        COALESCE(ast.total_likes, 0) AS total_likes,
        COALESCE(ast.profile_views, 0) AS profile_views,
        (
          SELECT COUNT(*)::int FROM blog_posts bp
          WHERE bp.user_id = ap.user_id AND COALESCE(bp.is_deleted, false) = false
        ) AS blog_posts_total,
        (
          SELECT COUNT(*)::int FROM blog_posts bp
          WHERE bp.user_id = ap.user_id AND bp.status = 'pending' AND COALESCE(bp.is_deleted, false) = false
        ) AS blog_posts_pending,
        (
          SELECT COUNT(*)::int FROM blog_posts bp
          WHERE bp.user_id = ap.user_id AND bp.status = 'approved' AND COALESCE(bp.is_deleted, false) = false
        ) AS blog_posts_approved,
        (
          SELECT COUNT(*)::int FROM blog_posts bp
          WHERE bp.user_id = ap.user_id AND bp.status = 'rejected' AND COALESCE(bp.is_deleted, false) = false
        ) AS blog_posts_rejected,
        (
          SELECT COUNT(*)::int FROM blog_drafts bd WHERE bd.user_id = ap.user_id
        ) AS drafts_count
      FROM author_profiles ap
      LEFT JOIN users u ON u.id = ap.user_id
      LEFT JOIN author_stats ast ON ast.author_id = ap.id
      WHERE ${whereSql}
      ORDER BY ${orderBy}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `

    const { rows } = await pool.query(listQuery, listParams)
    res.json({ total, limit, offset, authors: rows })
  } catch (e) {
    console.error('listAdminAuthors', e)
    res.status(500).json({ message: 'Failed to list authors' })
  }
}

export async function getAdminAuthor(pool: Pool | null, req: Request, res: Response) {
  if (!pool) return res.status(500).json({ message: 'Database not initialized' })
  const authorId = parseAuthorId(req, res)
  if (authorId == null) return

  try {
    const { rows: apRows } = await pool.query(
      `SELECT ap.*,
        u.email AS account_email,
        u.name AS account_name,
        u.unique_user_id AS account_unique_user_id,
        u.roles AS account_roles,
        u.member_since AS account_member_since,
        u.is_verified AS account_user_verified,
        u.profile_photo AS account_profile_photo,
        u.loyalty_points AS account_loyalty_points,
        u.phone AS account_phone,
        u.created_at AS account_created_at
       FROM author_profiles ap
       LEFT JOIN users u ON u.id = ap.user_id
       WHERE ap.id = $1
       LIMIT 1`,
      [authorId]
    )
    if (apRows.length === 0) {
      return res.status(404).json({ message: 'Author not found' })
    }
    const row = apRows[0] as Record<string, unknown>
    const userId = row.user_id as number | null

    const { rows: stRows } = await pool.query(
      `SELECT followers_count, subscribers_count, posts_count, total_views, total_likes,
              COALESCE(profile_views, 0)::int AS profile_views, updated_at
       FROM author_stats WHERE author_id = $1`,
      [authorId]
    )

    let blogSummary = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      trash: 0,
      drafts: 0,
    }
    let recentPosts: unknown[] = []

    if (userId != null) {
      const { rows: sumRows } = await pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE COALESCE(is_deleted, false) = false)::int AS total,
          COUNT(*) FILTER (WHERE status = 'pending' AND COALESCE(is_deleted, false) = false)::int AS pending,
          COUNT(*) FILTER (WHERE status = 'approved' AND COALESCE(is_deleted, false) = false)::int AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected' AND COALESCE(is_deleted, false) = false)::int AS rejected,
          COUNT(*) FILTER (WHERE COALESCE(is_deleted, false) = true)::int AS trash
         FROM blog_posts WHERE user_id = $1`,
        [userId]
      )
      if (sumRows[0]) {
        blogSummary = {
          total: sumRows[0].total ?? 0,
          pending: sumRows[0].pending ?? 0,
          approved: sumRows[0].approved ?? 0,
          rejected: sumRows[0].rejected ?? 0,
          trash: sumRows[0].trash ?? 0,
          drafts: 0,
        }
      }
      const { rows: dRows } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM blog_drafts WHERE user_id = $1`,
        [userId]
      )
      blogSummary.drafts = dRows[0]?.c ?? 0

      const { rows: rp } = await pool.query(
        `SELECT id, title, status, featured, created_at, updated_at,
                COALESCE(is_deleted, false) AS is_deleted,
                views_count, reads_count
         FROM blog_posts
         WHERE user_id = $1
         ORDER BY created_at DESC NULLS LAST
         LIMIT 20`,
        [userId]
      )
      recentPosts = rp
    }

    res.json({
      profile: row,
      stats: stRows[0] || null,
      blog: blogSummary,
      recent_posts: recentPosts,
    })
  } catch (e) {
    console.error('getAdminAuthor', e)
    res.status(500).json({ message: 'Failed to load author' })
  }
}

export async function patchAdminAuthor(pool: Pool | null, req: Request, res: Response) {
  if (!pool) return res.status(500).json({ message: 'Database not initialized' })
  const authorId = parseAuthorId(req, res)
  if (authorId == null) return

  const body = req.body || {}
  const nextStatus = body.status !== undefined ? String(body.status).toLowerCase() : undefined
  const nextVerified = body.is_verified
  const nextOnboarding = body.onboarding_completed

  if (
    nextStatus === undefined &&
    typeof nextVerified !== 'boolean' &&
    typeof nextOnboarding !== 'boolean'
  ) {
    return res.status(400).json({ message: 'No supported fields to update (status, is_verified, onboarding_completed)' })
  }

  if (nextStatus !== undefined && !VALID_STATUS.has(nextStatus)) {
    return res.status(400).json({ message: 'Invalid status' })
  }

  try {
    const { rows: cur } = await pool.query(`SELECT id FROM author_profiles WHERE id = $1`, [authorId])
    if (cur.length === 0) return res.status(404).json({ message: 'Author not found' })

    const sets: string[] = []
    const vals: unknown[] = []

    if (nextStatus !== undefined) {
      vals.push(nextStatus)
      sets.push(`status = $${vals.length}`)
      if (nextStatus === 'deleted') {
        sets.push(`deleted_at = CURRENT_TIMESTAMP`)
        sets.push(`recovery_until = CURRENT_TIMESTAMP + INTERVAL '30 days'`)
      } else {
        sets.push(`deleted_at = NULL`)
        sets.push(`recovery_until = NULL`)
      }
    }

    if (typeof nextVerified === 'boolean') {
      vals.push(nextVerified)
      sets.push(`is_verified = $${vals.length}`)
    }
    if (typeof nextOnboarding === 'boolean') {
      vals.push(nextOnboarding)
      sets.push(`onboarding_completed = $${vals.length}`)
    }

    sets.push('updated_at = CURRENT_TIMESTAMP')
    vals.push(authorId)
    const idPlaceholder = vals.length

    const { rows } = await pool.query(
      `UPDATE author_profiles SET ${sets.join(', ')} WHERE id = $${idPlaceholder} RETURNING *`,
      vals
    )

    res.json({ message: 'Author updated', author: rows[0] })
  } catch (e) {
    console.error('patchAdminAuthor', e)
    res.status(500).json({ message: 'Failed to update author' })
  }
}
