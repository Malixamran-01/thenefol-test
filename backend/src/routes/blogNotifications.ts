import express from 'express'
import { Pool } from 'pg'
import { authenticateToken } from '../utils/apiHelpers'

const router = express.Router()
let pool: Pool

export async function initBlogNotificationsRouter(databasePool: Pool) {
  pool = databasePool

  try {
    await databasePool.query(`
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
    `)
    await databasePool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_notifs_recipient
      ON blog_notifications(recipient_user_id, created_at DESC)
    `)
    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS blog_notification_preferences (
        user_id     INTEGER PRIMARY KEY,
        muted_until TIMESTAMPTZ
      )
    `)
  } catch (err) {
    console.error('Error creating blog_notifications tables:', err)
  }
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
  /** When true, deliver even if the user has muted blog notifications (e.g. moderation warnings). */
  bypassMute?: boolean
}): Promise<void> {
  if (!params.recipientUserId) return
  // Never notify yourself
  if (
    params.actorUserId != null &&
    String(params.recipientUserId) === String(params.actorUserId)
  ) return

  // Skip if recipient has muted notifications and mute hasn't expired
  if (!params.bypassMute) {
    try {
      const muteCheck = await params.pool.query(
        `SELECT 1 FROM blog_notification_preferences
         WHERE user_id = $1::integer AND muted_until IS NOT NULL AND muted_until > NOW()`,
        [params.recipientUserId]
      )
      if (muteCheck.rows.length > 0) return
    } catch { /* best-effort: if table doesn't exist yet just continue */ }
  }

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
    // Try author_profiles first (for authors)
    const { rows: authorRows } = await pool.query(
      `SELECT display_name, pen_name, username, profile_image
       FROM author_profiles
       WHERE user_id::text = $1::text
       LIMIT 1`,
      [userId]
    )
    const authorRow = authorRows[0]
    if (authorRow) {
      return {
        name: authorRow.display_name || authorRow.pen_name || authorRow.username || null,
        avatar: authorRow.profile_image || null,
      }
    }
    // Fall back to users table for non-authors
    const { rows: userRows } = await pool.query(
      `SELECT name, profile_photo FROM users WHERE id = $1::integer LIMIT 1`,
      [userId]
    )
    const userRow = userRows[0]
    return {
      name: userRow?.name || null,
      avatar: userRow?.profile_photo || null,
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
       WHERE recipient_user_id = $1::integer AND is_read = false
         AND type <> 'collab_task_assigned'`,
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
         AND type <> 'collab_task_assigned'
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

// ─── Mute / Unmute ────────────────────────────────────────────────────────────

const MUTE_DURATIONS: Record<string, string> = {
  '1h':      "NOW() + INTERVAL '1 hour'",
  '3h':      "NOW() + INTERVAL '3 hours'",
  '8h':      "NOW() + INTERVAL '8 hours'",
  '1d':      "NOW() + INTERVAL '1 day'",
  '1w':      "NOW() + INTERVAL '1 week'",
  'forever': "'2099-12-31 23:59:59+00'",
}

// GET /api/blog/notifications/mute-status
router.get('/notifications/mute-status', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'DB not initialized' })
    const { rows } = await pool.query(
      `SELECT muted_until FROM blog_notification_preferences
       WHERE user_id = $1::integer`,
      [req.userId]
    )
    const row = rows[0]
    const muted_until = row?.muted_until ?? null
    const is_muted = muted_until ? new Date(muted_until) > new Date() : false
    res.json({ is_muted, muted_until })
  } catch (err) {
    console.error('Error fetching mute status:', err)
    res.status(500).json({ message: 'Failed to fetch mute status' })
  }
})

// POST /api/blog/notifications/mute  body: { duration: '1h'|'3h'|'8h'|'1d'|'1w'|'forever' }
router.post('/notifications/mute', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'DB not initialized' })
    const { duration } = req.body as { duration: string }
    const expr = MUTE_DURATIONS[duration]
    if (!expr) return res.status(400).json({ message: 'Invalid duration' })

    await pool.query(
      `INSERT INTO blog_notification_preferences (user_id, muted_until)
       VALUES ($1::integer, ${expr})
       ON CONFLICT (user_id) DO UPDATE SET muted_until = ${expr}`,
      [req.userId]
    )
    const { rows } = await pool.query(
      `SELECT muted_until FROM blog_notification_preferences WHERE user_id = $1::integer`,
      [req.userId]
    )
    res.json({ ok: true, muted_until: rows[0]?.muted_until ?? null })
  } catch (err) {
    console.error('Error muting notifications:', err)
    res.status(500).json({ message: 'Failed to mute notifications' })
  }
})

// POST /api/blog/notifications/unmute
router.post('/notifications/unmute', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'DB not initialized' })
    await pool.query(
      `INSERT INTO blog_notification_preferences (user_id, muted_until)
       VALUES ($1::integer, NULL)
       ON CONFLICT (user_id) DO UPDATE SET muted_until = NULL`,
      [req.userId]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('Error unmuting notifications:', err)
    res.status(500).json({ message: 'Failed to unmute notifications' })
  }
})

export default router
