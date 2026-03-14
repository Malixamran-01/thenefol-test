import express from 'express'
import { Pool } from 'pg'
import { authenticateToken } from '../utils/apiHelpers'

const router = express.Router()
let pool: Pool

export function initBlogNotificationsRouter(databasePool: Pool) {
  pool = databasePool

  databasePool.query(`
    CREATE TABLE IF NOT EXISTS blog_notifications (
      id          SERIAL PRIMARY KEY,
      recipient_user_id INTEGER NOT NULL,
      actor_user_id     INTEGER,
      actor_name        TEXT,
      actor_avatar      TEXT,
      type              TEXT NOT NULL,
      post_id           TEXT,
      post_title        TEXT,
      comment_id        INTEGER,
      comment_excerpt   TEXT,
      is_read           BOOLEAN DEFAULT FALSE,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch((err: Error) => console.error('Error creating blog_notifications table:', err))

  databasePool.query(`
    CREATE INDEX IF NOT EXISTS idx_blog_notifs_recipient
    ON blog_notifications(recipient_user_id, created_at DESC)
  `).catch(() => {/* index may already exist */})
}

// ─── Helper exported to blog.ts / blogActivity.ts ────────────────────────────

export async function createNotification(params: {
  pool: Pool
  recipientUserId: number | string | null | undefined
  actorUserId: number | string | null | undefined
  actorName?: string | null
  actorAvatar?: string | null
  type: string
  postId?: string | null
  postTitle?: string | null
  commentId?: number | null
  commentExcerpt?: string | null
}): Promise<void> {
  if (!params.recipientUserId) return
  // Never notify yourself
  if (
    params.actorUserId != null &&
    String(params.recipientUserId) === String(params.actorUserId)
  ) return

  try {
    await params.pool.query(
      `INSERT INTO blog_notifications
         (recipient_user_id, actor_user_id, actor_name, actor_avatar,
          type, post_id, post_title, comment_id, comment_excerpt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.recipientUserId,
        params.actorUserId ?? null,
        params.actorName ?? null,
        params.actorAvatar ?? null,
        params.type,
        params.postId ?? null,
        params.postTitle ?? null,
        params.commentId ?? null,
        params.commentExcerpt ?? null,
      ]
    )
  } catch (err) {
    console.error('Error creating notification:', err)
  }
}

// ─── Helper: resolve actor display name + avatar from user_id ────────────────

export async function resolveActor(
  pool: Pool,
  userId: string | number | null | undefined
): Promise<{ name: string | null; avatar: string | null }> {
  if (!userId) return { name: null, avatar: null }
  try {
    const { rows } = await pool.query(
      `SELECT display_name, pen_name, username, profile_image
       FROM author_profiles
       WHERE user_id::text = $1::text
       LIMIT 1`,
      [userId]
    )
    const row = rows[0]
    return {
      name: row?.display_name || row?.pen_name || row?.username || null,
      avatar: row?.profile_image || null,
    }
  } catch {
    return { name: null, avatar: null }
  }
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET /api/blog/notifications/unread-count
router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'DB not initialized' })
    const userId = req.userId
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM blog_notifications
       WHERE recipient_user_id = $1::integer AND is_read = false`,
      [userId]
    )
    res.json({ count: rows[0]?.count ?? 0 })
  } catch (err) {
    console.error('Error fetching notification count:', err)
    res.status(500).json({ message: 'Failed to fetch notification count' })
  }
})

// GET /api/blog/notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'DB not initialized' })
    const userId = req.userId
    const limit = parseInt(req.query.limit as string) || 30
    const offset = parseInt(req.query.offset as string) || 0

    const { rows } = await pool.query(
      `SELECT id, actor_user_id, actor_name, actor_avatar, type,
              post_id, post_title, comment_id, comment_excerpt,
              is_read, created_at
       FROM blog_notifications
       WHERE recipient_user_id = $1::integer
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )
    res.json(rows)
  } catch (err) {
    console.error('Error fetching notifications:', err)
    res.status(500).json({ message: 'Failed to fetch notifications' })
  }
})

// POST /api/blog/notifications/read-all
router.post('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'DB not initialized' })
    await pool.query(
      `UPDATE blog_notifications SET is_read = true
       WHERE recipient_user_id = $1::integer AND is_read = false`,
      [req.userId]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('Error marking all notifications read:', err)
    res.status(500).json({ message: 'Failed to mark notifications read' })
  }
})

// POST /api/blog/notifications/:id/read
router.post('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'DB not initialized' })
    await pool.query(
      `UPDATE blog_notifications SET is_read = true
       WHERE id = $1 AND recipient_user_id = $2::integer`,
      [req.params.id, req.userId]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('Error marking notification read:', err)
    res.status(500).json({ message: 'Failed to mark notification read' })
  }
})

export default router
