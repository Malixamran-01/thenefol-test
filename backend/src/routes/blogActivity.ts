import express from 'express'
import { Pool } from 'pg'
import { authenticateToken } from '../utils/apiHelpers'
import { createNotification, resolveActor } from './blogNotifications'

const router = express.Router()
let pool: Pool

export function initBlogActivityRouter(databasePool: Pool) {
  pool = databasePool
  // Ensure reposts table exists (also created in blog.ts, but guard here too)
  databasePool.query(`
    CREATE TABLE IF NOT EXISTS blog_post_reposts (
      id SERIAL PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (post_id, user_id)
    )
  `).catch((err: Error) => console.error('Error ensuring blog_post_reposts table:', err))
}

const getUserIdFromToken = (req: express.Request): string | null => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  const tokenParts = token.split('_')
  if (tokenParts.length >= 3 && tokenParts[0] === 'user' && tokenParts[1] === 'token') {
    return tokenParts[2]
  }
  return null
}

// Resolve author_profiles.id from identifier (can be author id, user_id, username, or unique_user_id)
// ORDER BY id ASC ensures canonical id when duplicate profiles exist for same user (e.g. id=1 and id=4)
const resolveAuthorId = async (identifier: string): Promise<number | null> => {
  const isNumeric = /^\d+$/.test(identifier)
  const usernameClean = identifier.startsWith('@') ? identifier.slice(1) : identifier
  const { rows } = await pool.query(
    `SELECT id FROM author_profiles 
     WHERE status != 'deleted' AND ${
       isNumeric
         ? '(id = $1::integer OR user_id = $1::integer)'
         : '(username = $1 OR username = $2 OR unique_user_id = $1)'
     }
     ORDER BY id ASC
     LIMIT 1`,
    isNumeric ? [identifier] : [identifier, usernameClean]
  )
  return rows[0]?.id ?? null
}

// Follow/Unfollow author
router.post('/authors/:authorId/follow', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const { authorId } = req.params
    const resolvedId = await resolveAuthorId(authorId)
    if (resolvedId == null) {
      return res.status(404).json({ message: 'Author not found or inactive' })
    }
    const userId = req.userId

    // Check if trying to follow self
    const { rows: selfCheck } = await pool.query(
      `SELECT 1 FROM author_profiles WHERE id = $1 AND user_id = $2::integer`,
      [resolvedId, userId]
    )

    if (selfCheck.length > 0) {
      return res.status(400).json({ message: 'Cannot follow yourself' })
    }

    // Add follower (check if actually inserted to avoid duplicate notifications)
    const insertResult = await pool.query(
      `INSERT INTO author_followers (author_id, follower_user_id, created_at)
       VALUES ($1, $2::integer, CURRENT_TIMESTAMP)
       ON CONFLICT (author_id, follower_user_id) DO NOTHING
       RETURNING 1`,
      [resolvedId, userId]
    )
    const wasNewFollow = (insertResult.rowCount ?? 0) > 0

    // Log activity (optional - blog_activities may lack author_id in older schemas)
    try {
      await pool.query(
        `INSERT INTO blog_activities (user_id, author_id, activity_type, created_at)
         VALUES ($1::integer, $2, 'follow', CURRENT_TIMESTAMP)`,
        [userId, resolvedId]
      )
    } catch { /* activity logging failure should not break follow */ }

    // Get updated count from cached stats
    const { rows } = await pool.query(
      `SELECT followers_count FROM author_stats WHERE author_id = $1`,
      [resolvedId]
    )

    // Notify the author being followed only when it's a new follow (before response so it completes)
    if (wasNewFollow) {
      try {
        const { rows: authorRows } = await pool.query(
          `SELECT user_id FROM author_profiles WHERE id = $1 AND status != 'deleted' LIMIT 1`,
          [resolvedId]
        )
        if (authorRows.length > 0) {
          const actor = await resolveActor(pool, userId)
          await createNotification({
            pool,
            recipientUserId: authorRows[0].user_id,
            actorUserId: userId,
            actorName: actor.name,
            actorAvatar: actor.avatar,
            type: 'followed',
          })
        }
      } catch (err) {
        console.error('[follow] Error creating follow notification:', err)
      }
    }

    res.json({ 
      message: 'Author followed successfully',
      followerCount: rows[0]?.followers_count || 0 
    })
  } catch (error) {
    console.error('Error following author:', error)
    res.status(500).json({ message: 'Failed to follow author' })
  }
})

router.delete('/authors/:authorId/follow', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const { authorId } = req.params
    const resolvedId = await resolveAuthorId(authorId)
    if (resolvedId == null) {
      return res.status(404).json({ message: 'Author not found' })
    }
    const userId = req.userId

    await pool.query(
      `DELETE FROM author_followers WHERE author_id = $1 AND follower_user_id = $2::integer`,
      [resolvedId, userId]
    )

    // Get updated count from cached stats
    const { rows } = await pool.query(
      `SELECT followers_count FROM author_stats WHERE author_id = $1`,
      [resolvedId]
    )

    res.json({ 
      message: 'Author unfollowed successfully',
      followerCount: rows[0]?.followers_count || 0 
    })
  } catch (error) {
    console.error('Error unfollowing author:', error)
    res.status(500).json({ message: 'Failed to unfollow author' })
  }
})

// Subscribe/Unsubscribe to author
router.post('/authors/:authorId/subscribe', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const { authorId } = req.params
    const resolvedId = await resolveAuthorId(authorId)
    if (resolvedId == null) {
      return res.status(404).json({ message: 'Author not found or inactive' })
    }
    const userId = req.userId

    // Get user email
    const { rows: userRows } = await pool.query(
      `SELECT email FROM users WHERE id = $1::integer`,
      [userId]
    )

    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const email = userRows[0].email

    // Check if trying to subscribe to self
    const { rows: selfCheck } = await pool.query(
      `SELECT 1 FROM author_profiles WHERE id = $1 AND user_id = $2::integer`,
      [resolvedId, userId]
    )

    if (selfCheck.length > 0) {
      return res.status(400).json({ message: 'Cannot subscribe to yourself' })
    }

    // Add subscription
    await pool.query(
      `INSERT INTO author_subscriptions (author_id, user_id, email, type, status, subscribed_at)
       VALUES ($1, $2::integer, $3, 'free', 'active', CURRENT_TIMESTAMP)
       ON CONFLICT ON CONSTRAINT author_subscriptions_author_id_user_id_key 
       DO UPDATE SET status = 'active', subscribed_at = CURRENT_TIMESTAMP, cancelled_at = NULL`,
      [resolvedId, userId, email]
    )

    // Get updated count from cached stats
    const { rows } = await pool.query(
      `SELECT subscribers_count FROM author_stats WHERE author_id = $1`,
      [resolvedId]
    )

    // Notify the author being subscribed to (before response so it completes)
    try {
      const { rows: authorRows } = await pool.query(
        `SELECT user_id FROM author_profiles WHERE id = $1 AND status != 'deleted' LIMIT 1`,
        [resolvedId]
      )
      if (authorRows.length > 0) {
        const actor = await resolveActor(pool, userId)
        await createNotification({
          pool,
          recipientUserId: authorRows[0].user_id,
          actorUserId: userId,
          actorName: actor.name,
          actorAvatar: actor.avatar,
          type: 'subscribed',
        })
      }
    } catch (err) {
      console.error('[subscribe] Error creating subscription notification:', err)
    }

    res.json({ 
      message: 'Subscribed to author successfully',
      subscriberCount: rows[0]?.subscribers_count || 0 
    })
  } catch (error) {
    console.error('Error subscribing to author:', error)
    res.status(500).json({ message: 'Failed to subscribe to author' })
  }
})

router.delete('/authors/:authorId/subscribe', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const { authorId } = req.params
    const resolvedId = await resolveAuthorId(authorId)
    if (resolvedId == null) {
      return res.status(404).json({ message: 'Author not found' })
    }
    const userId = req.userId

    // Soft cancel subscription (don't delete, just mark cancelled)
    await pool.query(
      `UPDATE author_subscriptions 
       SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
       WHERE author_id = $1 AND user_id = $2::integer`,
      [resolvedId, userId]
    )

    // Get updated count from cached stats
    const { rows } = await pool.query(
      `SELECT subscribers_count FROM author_stats WHERE author_id = $1`,
      [resolvedId]
    )

    res.json({ 
      message: 'Unsubscribed from author successfully',
      subscriberCount: rows[0]?.subscribers_count || 0 
    })
  } catch (error) {
    console.error('Error unsubscribing from author:', error)
    res.status(500).json({ message: 'Failed to unsubscribe from author' })
  }
})

// Get current user's following (works for both authors and non-authors; uses user_id so follows persist across onboarding)
// Exclude self from list (ap.user_id != userId) - you cannot follow your own profile
router.get('/authors/me/following', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'Database not initialized' })
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Authentication required' })
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0

    const { rows } = await pool.query(
      `SELECT
         af.author_id,
         ap.id          AS author_profile_id,
         ap.username,
         ap.display_name,
         ap.pen_name,
         ap.profile_image,
         ap.bio,
         af.created_at
       FROM author_followers af
       JOIN author_profiles ap
         ON ap.id = af.author_id
         AND ap.status != 'deleted'
         AND ap.user_id != $1::integer
       WHERE af.follower_user_id = $1::integer
       ORDER BY af.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching my following:', error)
    res.status(500).json({ message: 'Failed to fetch following' })
  }
})

// Get current user's stats (works for both authors and non-authors; following count uses user_id)
router.get('/authors/me/stats', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'Database not initialized' })
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Authentication required' })

    // Check if user has author profile
    const { rows: authorRows } = await pool.query(
      `SELECT id FROM author_profiles WHERE user_id = $1::integer AND status != 'deleted' LIMIT 1`,
      [userId]
    )
    const hasAuthorProfile = authorRows.length > 0
    const authorProfileId = authorRows[0]?.id ?? null

    // Following count: always from author_followers by user_id (persists across onboarding)
    const { rows: followingRows } = await pool.query(
      `SELECT COUNT(*)::integer as count FROM author_followers WHERE follower_user_id = $1::integer`,
      [userId]
    )
    const followingCount = followingRows[0]?.count ?? 0

    let followersCount = 0
    let subscribersCount = 0
    let postsCount = 0
    let totalViews = 0
    let totalLikes = 0

    if (hasAuthorProfile && authorProfileId) {
      const { rows: statsRows } = await pool.query(
        `SELECT followers_count, subscribers_count, posts_count, total_views, total_likes
         FROM author_stats WHERE author_id = $1`,
        [authorProfileId]
      )
      const s = statsRows[0]
      followersCount = s?.followers_count ?? 0
      subscribersCount = s?.subscribers_count ?? 0
      postsCount = s?.posts_count ?? 0
      totalViews = s?.total_views ?? 0
      totalLikes = s?.total_likes ?? 0
    }

    res.json({
      followers: followersCount,
      subscribers: subscribersCount,
      following: followingCount,
      posts: postsCount,
      views: totalViews,
      likes: totalLikes,
      isFollowing: false,
      isSubscribed: false
    })
  } catch (error) {
    console.error('Error fetching my stats:', error)
    res.status(500).json({ message: 'Failed to fetch stats' })
  }
})

// Get current user's stats and following by user_id (works for both authors and non-authors)
// Must be before /authors/:authorId/... so /authors/me/stats and /authors/me/following match
router.get('/authors/me/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId || !pool) return res.status(401).json({ message: 'Authentication required' })
    const authorUserId = parseInt(userId, 10)
    if (isNaN(authorUserId)) return res.status(400).json({ message: 'Invalid user' })

    // Following count: always from author_followers by user_id (persists across author profile creation)
    const { rows: followingRows } = await pool.query(
      `SELECT COUNT(*)::integer as count FROM author_followers WHERE follower_user_id = $1`,
      [authorUserId]
    )
    const followingCount = followingRows[0]?.count ?? 0

    // If user has author profile, return full stats
    const { rows: apRows } = await pool.query(
      `SELECT id FROM author_profiles WHERE user_id = $1 AND status != 'deleted' LIMIT 1`,
      [authorUserId]
    )
    if (apRows.length > 0) {
      const resolvedId = apRows[0].id
      const { rows: statsRows } = await pool.query(
        `SELECT followers_count, subscribers_count, posts_count, total_views, total_likes
         FROM author_stats WHERE author_id = $1`,
        [resolvedId]
      )
      const stats = statsRows[0] || {}
      return res.json({
        followers: stats.followers_count ?? 0,
        subscribers: stats.subscribers_count ?? 0,
        following: followingCount,
        posts: stats.posts_count ?? 0,
        views: stats.total_views ?? 0,
        likes: stats.total_likes ?? 0,
        isFollowing: false,
        isSubscribed: false
      })
    }

    // No author profile: return following count only (non-authors)
    res.json({
      followers: 0,
      subscribers: 0,
      following: followingCount,
      posts: 0,
      views: 0,
      likes: 0,
      isFollowing: false,
      isSubscribed: false
    })
  } catch (error) {
    console.error('Error fetching my stats:', error)
    res.status(500).json({ message: 'Failed to fetch stats' })
  }
})

router.get('/authors/me/following', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId || !pool) return res.status(401).json({ message: 'Authentication required' })
    const authorUserId = parseInt(userId, 10)
    if (isNaN(authorUserId)) return res.json([])

    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0
    const { rows } = await pool.query(
      `SELECT
         af.author_id,
         ap.id          AS author_profile_id,
         ap.username,
         ap.display_name,
         ap.pen_name,
         ap.profile_image,
         ap.bio,
         af.created_at
       FROM author_followers af
       JOIN author_profiles ap
         ON ap.id = af.author_id
         AND ap.status != 'deleted'
       WHERE af.follower_user_id = $1
       ORDER BY af.created_at DESC
       LIMIT $2 OFFSET $3`,
      [authorUserId, limit, offset]
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching my following:', error)
    res.status(500).json({ message: 'Failed to fetch following' })
  }
})

// Get list of followers for an author
router.get('/authors/:authorId/followers', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'Database not initialized' })
    const { authorId } = req.params
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0
    const resolvedId = await resolveAuthorId(authorId)
    if (resolvedId == null) return res.status(404).json({ message: 'Author not found' })

    const { rows } = await pool.query(
      `SELECT
         af.follower_user_id,
         ap.id          AS author_profile_id,
         ap.username,
         ap.display_name,
         ap.pen_name,
         ap.profile_image,
         ap.bio,
         af.created_at
       FROM author_followers af
       LEFT JOIN author_profiles ap
         ON ap.user_id = af.follower_user_id
         AND ap.status != 'deleted'
       WHERE af.author_id = $1
       ORDER BY af.created_at DESC
       LIMIT $2 OFFSET $3`,
      [resolvedId, limit, offset]
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching followers:', error)
    res.status(500).json({ message: 'Failed to fetch followers' })
  }
})

// Get list of authors that this author follows
router.get('/authors/:authorId/following', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'Database not initialized' })
    const { authorId } = req.params
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0
    const resolvedId = await resolveAuthorId(authorId)
    if (resolvedId == null) return res.status(404).json({ message: 'Author not found' })

    // Get this author's user_id first
    const { rows: authorRows } = await pool.query(
      `SELECT user_id FROM author_profiles WHERE id = $1 LIMIT 1`,
      [resolvedId]
    )
    if (authorRows.length === 0) return res.json([])
    const authorUserId = authorRows[0].user_id

    const { rows } = await pool.query(
      `SELECT
         af.author_id,
         ap.id          AS author_profile_id,
         ap.username,
         ap.display_name,
         ap.pen_name,
         ap.profile_image,
         ap.bio,
         af.created_at
       FROM author_followers af
       JOIN author_profiles ap
         ON ap.id = af.author_id
         AND ap.status != 'deleted'
         AND ap.user_id != $1
       WHERE af.follower_user_id = $1::integer
       ORDER BY af.created_at DESC
       LIMIT $2 OFFSET $3`,
      [authorUserId, limit, offset]
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching following:', error)
    res.status(500).json({ message: 'Failed to fetch following' })
  }
})

// Get list of subscribers for an author
router.get('/authors/:authorId/subscribers', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'Database not initialized' })
    const { authorId } = req.params
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0
    const resolvedId = await resolveAuthorId(authorId)
    if (resolvedId == null) return res.status(404).json({ message: 'Author not found' })

    const { rows } = await pool.query(
      `SELECT
         asub.user_id,
         ap.id          AS author_profile_id,
         ap.username,
         ap.display_name,
         ap.pen_name,
         ap.profile_image,
         ap.bio,
         asub.subscribed_at AS created_at
       FROM author_subscriptions asub
       LEFT JOIN author_profiles ap
         ON ap.user_id::text = asub.user_id::text
         AND ap.status != 'deleted'
       WHERE asub.author_id = $1
         AND asub.status = 'active'
       ORDER BY asub.subscribed_at DESC
       LIMIT $2 OFFSET $3`,
      [resolvedId, limit, offset]
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching subscribers:', error)
    res.status(500).json({ message: 'Failed to fetch subscribers' })
  }
})

// Get author stats (followers, subscribers)
router.get('/authors/:authorId/stats', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const { authorId } = req.params
    const resolvedId = await resolveAuthorId(authorId)
    if (resolvedId == null) {
      return res.status(404).json({ message: 'Author not found' })
    }
    const userId = getUserIdFromToken(req)

    // Get author's user_id (for following_count: how many authors this person follows)
    const { rows: authorUserRows } = await pool.query(
      `SELECT user_id FROM author_profiles WHERE id = $1 LIMIT 1`,
      [resolvedId]
    )
    const authorUserId = authorUserRows[0]?.user_id ?? null

    // Get following count: how many authors does this user follow?
    let followingCount = 0
    if (authorUserId) {
      const { rows: followingRows } = await pool.query(
        `SELECT COUNT(*)::integer as count FROM author_followers WHERE follower_user_id = $1`,
        [authorUserId]
      )
      followingCount = followingRows[0]?.count ?? 0
    }

    // Get cached stats
    const { rows: statsRows } = await pool.query(
      `SELECT followers_count, subscribers_count, posts_count, total_views, total_likes
       FROM author_stats WHERE author_id = $1`,
      [resolvedId]
    )

    let isFollowing = false
    let isSubscribed = false

    if (userId && authorUserId) {
      // Check if viewer follows ANY of this author's profiles (handles duplicate author_profiles)
      const { rows: followingRows } = await pool.query(
        `SELECT 1 FROM author_followers af
         JOIN author_profiles ap ON ap.id = af.author_id
         WHERE ap.user_id = $1::integer AND af.follower_user_id = $2::integer LIMIT 1`,
        [authorUserId, userId]
      )
      isFollowing = followingRows.length > 0

      const { rows: subscribedRows } = await pool.query(
        `SELECT 1 FROM author_subscriptions asub
         JOIN author_profiles ap ON ap.id = asub.author_id
         WHERE ap.user_id = $1::integer AND asub.user_id = $2::integer AND asub.status = 'active' LIMIT 1`,
        [authorUserId, userId]
      )
      isSubscribed = subscribedRows.length > 0
    }

    const stats = statsRows[0] || {
      followers_count: 0,
      subscribers_count: 0,
      posts_count: 0,
      total_views: 0,
      total_likes: 0
    }

    res.json({
      followers: stats.followers_count,
      subscribers: stats.subscribers_count,
      following: followingCount,
      posts: stats.posts_count,
      views: stats.total_views,
      likes: stats.total_likes,
      isFollowing,
      isSubscribed
    })
  } catch (error) {
    console.error('Error fetching author stats:', error)
    res.status(500).json({ message: 'Failed to fetch author stats' })
  }
})

// Get author's activity (likes, comments, posts)
router.get('/authors/:authorId/activity', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const { authorId } = req.params
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0

    const resolvedId = await resolveAuthorId(authorId)
    if (resolvedId == null) {
      return res.status(404).json({ message: 'Author not found' })
    }

    const { rows: authorRows } = await pool.query(
      `SELECT user_id FROM author_profiles WHERE id = $1 AND status != 'deleted'`,
      [resolvedId]
    )
    if (authorRows.length === 0) {
      return res.json([])
    }
    const userIdOfAuthor = String(authorRows[0].user_id)

    // Get author's liked posts
    const { rows: likedPosts } = await pool.query(
      `SELECT 
        'liked_post' as activity_type,
        bp.id::text as post_id,
        bp.title as post_title,
        bp.excerpt as post_excerpt,
        bp.cover_image,
        bp.author_name as post_author_name,
        bp.author_email as post_author_email,
        ap.id as post_author_id,
        bpl.created_at as activity_date
       FROM blog_post_likes bpl
       JOIN blog_posts bp ON bpl.post_id::text = bp.id::text
       LEFT JOIN author_profiles ap ON bp.author_id::text = ap.id::text
       WHERE bpl.user_id::text = $1
         AND bp.status = 'approved'
         AND bp.is_active = true
         AND bp.is_deleted = false
       ORDER BY bpl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userIdOfAuthor, limit, offset]
    )

    // Get author's comments on posts
    const { rows: commentedPosts } = await pool.query(
      `SELECT DISTINCT ON (bp.id)
        'commented_on_post' as activity_type,
        bp.id::text as post_id,
        bp.title as post_title,
        bp.excerpt as post_excerpt,
        bp.cover_image,
        bp.author_name as post_author_name,
        bp.author_email as post_author_email,
        ap.id as post_author_id,
        bc.content as comment_content,
        bc.created_at as activity_date
       FROM blog_comments bc
       JOIN blog_posts bp ON bc.post_id::text = bp.id::text
       LEFT JOIN author_profiles ap ON bp.author_id::text = ap.id::text
       WHERE bc.user_id::text = $1
         AND bc.is_deleted = false
         AND bp.status = 'approved'
         AND bp.is_active = true
         AND bp.is_deleted = false
       ORDER BY bp.id, bc.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userIdOfAuthor, limit, offset]
    )

    // Get author's published posts — match by author_id OR user_id (older posts may lack author_id)
    const { rows: publishedPosts } = await pool.query(
      `SELECT 
        'published_post' as activity_type,
        bp.id::text as post_id,
        bp.title as post_title,
        bp.excerpt as post_excerpt,
        bp.cover_image,
        bp.author_name as post_author_name,
        bp.author_email as post_author_email,
        bp.author_id as post_author_id,
        bp.created_at as activity_date
       FROM blog_posts bp
       WHERE (bp.author_id::text = $1 OR bp.user_id::text = $1)
         AND bp.status = 'approved'
         AND bp.is_active = true
         AND bp.is_deleted = false
       ORDER BY bp.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userIdOfAuthor, limit, offset]
    )
    console.log(`[activity] resolvedId=${resolvedId} userIdOfAuthor=${userIdOfAuthor} publishedPosts=${publishedPosts.length}`)

    // Get author's reposted posts (wrapped in try/catch so it won't break other activity types)
    let repostedPosts: any[] = []
    try {
      const { rows } = await pool.query(
        `SELECT 
          'reposted_post' as activity_type,
          bp.id::text as post_id,
          bp.title as post_title,
          bp.excerpt as post_excerpt,
          bp.cover_image,
          bp.author_name as post_author_name,
          bp.author_email as post_author_email,
          ap.id as post_author_id,
          bpr.created_at as activity_date
         FROM blog_post_reposts bpr
         JOIN blog_posts bp ON bpr.post_id::text = bp.id::text
         LEFT JOIN author_profiles ap ON bp.author_id::text = ap.id::text
         WHERE bpr.user_id::text = $1
           AND bp.is_deleted = false
         ORDER BY bpr.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userIdOfAuthor, limit, offset]
      )
      repostedPosts = rows
      console.log(`[activity] repostedPosts for user ${userIdOfAuthor}:`, repostedPosts.length)
    } catch (err) {
      console.error('[activity] Error fetching reposted posts:', err)
    }

    // Combine all activities and sort by date
    const allActivities = [
      ...likedPosts,
      ...commentedPosts,
      ...publishedPosts,
      ...repostedPosts
    ].sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime())
      .slice(0, limit)

    console.log(`[activity] total combined activities: ${allActivities.length} (liked=${likedPosts.length} commented=${commentedPosts.length} published=${publishedPosts.length} reposted=${repostedPosts.length})`)
    res.json(allActivities)
  } catch (error) {
    console.error('Error fetching author activity:', error)
    res.status(500).json({ message: 'Failed to fetch author activity' })
  }
})

// Get personalized feed for user (shows activities from followed/subscribed authors)
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const userId = req.userId
    const limit = parseInt(req.query.limit as string) || 30
    const offset = parseInt(req.query.offset as string) || 0

    // Get list of authors the user follows or is subscribed to (using new tables)
    const { rows: followedAuthors } = await pool.query(
      `SELECT DISTINCT author_id 
       FROM (
         SELECT author_id FROM author_followers WHERE follower_user_id = $1::integer
         UNION
         SELECT author_id FROM author_subscriptions WHERE user_id = $1::integer AND status = 'active'
       ) AS combined`,
      [userId]
    )

    if (followedAuthors.length === 0) {
      // If not following anyone, return popular/recent posts
      const { rows: popularPosts } = await pool.query(
        `SELECT 
          'popular_post' as activity_type,
          bp.id as post_id,
          bp.title as post_title,
          bp.excerpt as post_excerpt,
          bp.cover_image,
          ap.display_name as author_name,
          ap.username as author_handle,
          ap.id as author_id,
          bp.created_at as activity_date,
          COUNT(DISTINCT bpl.id)::int as like_count,
          COUNT(DISTINCT bc.id)::int as comment_count
         FROM blog_posts bp
         LEFT JOIN author_profiles ap ON bp.author_id = ap.id
         LEFT JOIN blog_post_likes bpl ON bp.id::text = bpl.post_id
         LEFT JOIN blog_comments bc ON bp.id = bc.post_id::integer AND bc.is_deleted = false
         WHERE bp.status = 'approved'
           AND bp.is_active = true
           AND bp.is_deleted = false
         GROUP BY bp.id, ap.id
         ORDER BY like_count DESC, comment_count DESC, bp.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      )
      return res.json(popularPosts)
    }

    const authorIds = followedAuthors.map(row => row.author_id)

    // Get user_ids for these authors
    const { rows: userIds } = await pool.query(
      `SELECT id, user_id FROM author_profiles WHERE id = ANY($1)`,
      [authorIds]
    )

    const userIdsList = userIds.map(row => String(row.user_id))

    // Get activities from followed authors
    const { rows: feedActivities } = await pool.query(
      `
      WITH author_likes AS (
        SELECT 
          'author_liked' as activity_type,
          ap.id as actor_author_id,
          ap.display_name as actor_name,
          ap.username as actor_handle,
          bp.id as post_id,
          bp.title as post_title,
          bp.excerpt as post_excerpt,
          bp.cover_image,
          bp_author.display_name as post_author_name,
          bp.author_id as post_author_id,
          bpl.created_at as activity_date
        FROM blog_post_likes bpl
        JOIN blog_posts bp ON bpl.post_id = bp.id::text
        LEFT JOIN author_profiles ap ON ap.user_id = bpl.user_id::integer
        LEFT JOIN author_profiles bp_author ON bp.author_id = bp_author.id
        WHERE bpl.user_id = ANY($1)
          AND bp.status = 'approved'
          AND bp.is_active = true
          AND bp.is_deleted = false
      ),
      author_comments AS (
        SELECT 
          'author_commented' as activity_type,
          ap.id as actor_author_id,
          ap.display_name as actor_name,
          ap.username as actor_handle,
          bp.id as post_id,
          bp.title as post_title,
          bp.excerpt as post_excerpt,
          bp.cover_image,
          bp_author.display_name as post_author_name,
          bp.author_id as post_author_id,
          bc.content as comment_content,
          bc.created_at as activity_date
        FROM blog_comments bc
        JOIN blog_posts bp ON bc.post_id = bp.id::text
        LEFT JOIN author_profiles ap ON ap.user_id = bc.user_id::integer
        LEFT JOIN author_profiles bp_author ON bp.author_id = bp_author.id
        WHERE bc.user_id = ANY($1)
          AND bc.is_deleted = false
          AND bp.status = 'approved'
          AND bp.is_active = true
          AND bp.is_deleted = false
      ),
      author_posts AS (
        SELECT 
          'author_published' as activity_type,
          ap.id as actor_author_id,
          ap.display_name as actor_name,
          ap.username as actor_handle,
          bp.id as post_id,
          bp.title as post_title,
          bp.excerpt as post_excerpt,
          bp.cover_image,
          ap.display_name as post_author_name,
          bp.author_id as post_author_id,
          NULL as comment_content,
          bp.created_at as activity_date
        FROM blog_posts bp
        JOIN author_profiles ap ON bp.author_id = ap.id
        WHERE bp.author_id = ANY($2)
          AND bp.status = 'approved'
          AND bp.is_active = true
          AND bp.is_deleted = false
      )
      SELECT * FROM (
        SELECT * FROM author_likes
        UNION ALL
        SELECT * FROM author_comments
        UNION ALL
        SELECT * FROM author_posts
      ) combined
      ORDER BY activity_date DESC
      LIMIT $3 OFFSET $4
      `,
      [userIdsList, authorIds, limit, offset]
    )

    res.json(feedActivities)
  } catch (error) {
    console.error('Error fetching feed:', error)
    res.status(500).json({ message: 'Failed to fetch feed' })
  }
})

// Get suggested authors to follow (based on shared interests, popular authors, etc.)
router.get('/authors/suggestions', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const userId = req.userId
    const limit = parseInt(req.query.limit as string) || 10

    // Find active authors user is not following yet, ranked by engagement
    const { rows } = await pool.query(
      `SELECT 
        ap.id as author_id,
        ap.display_name as author_name,
        ap.username as author_handle,
        ap.bio,
        ap.profile_image,
        COALESCE(ast.followers_count, 0) as follower_count,
        COALESCE(ast.subscribers_count, 0) as subscriber_count,
        COALESCE(ast.posts_count, 0) as post_count,
        COALESCE(ast.total_likes, 0) as total_likes
       FROM author_profiles ap
       LEFT JOIN author_stats ast ON ap.id = ast.author_id
       WHERE ap.status = 'active'
         AND ap.user_id != $1::integer
         AND ap.id NOT IN (
           SELECT author_id FROM author_followers WHERE follower_user_id = $1::integer
         )
       ORDER BY 
         COALESCE(ast.followers_count, 0) DESC,
         COALESCE(ast.total_likes, 0) DESC,
         COALESCE(ast.posts_count, 0) DESC
       LIMIT $2`,
      [userId, limit]
    )

    res.json(rows)
  } catch (error) {
    console.error('Error fetching author suggestions:', error)
    res.status(500).json({ message: 'Failed to fetch author suggestions' })
  }
})

// ==================== AUTHOR PROFILE CRUD ====================

// Get current user's own author profile (authenticated) - used for Profile tab navigation
router.get('/authors/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId || !pool) {
      return res.status(401).json({ message: 'Authentication required' })
    }
    const { rows } = await pool.query(
      `SELECT ap.*, u.email as user_email, u.name as user_name,
        COALESCE(ast.followers_count, 0) as followers_count,
        COALESCE(ast.subscribers_count, 0) as subscribers_count,
        COALESCE(ast.posts_count, 0) as posts_count,
        COALESCE(ast.total_views, 0) as total_views,
        COALESCE(ast.total_likes, 0) as total_likes
       FROM author_profiles ap
       LEFT JOIN users u ON ap.user_id = u.id
       LEFT JOIN author_stats ast ON ap.id = ast.author_id
       WHERE ap.user_id = $1::integer AND ap.status != 'deleted'
       LIMIT 1`,
      [userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No author profile found' })
    }
    res.json(rows[0])
  } catch (error) {
    console.error('Error fetching my author profile:', error)
    res.status(500).json({ message: 'Failed to fetch profile' })
  }
})

// Get current user's stats (works for both authors and non-authors - uses user_id for following count)
router.get('/authors/me/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId || !pool) {
      return res.status(401).json({ message: 'Authentication required' })
    }
    const userIdInt = parseInt(userId, 10)

    // Check if user has author profile
    const { rows: profileRows } = await pool.query(
      `SELECT id FROM author_profiles WHERE user_id = $1::integer AND status != 'deleted' LIMIT 1`,
      [userId]
    )

    let followersCount = 0
    let subscribersCount = 0
    let postsCount = 0
    let totalViews = 0
    let totalLikes = 0

    if (profileRows.length > 0) {
      const authorId = profileRows[0].id
      const { rows: statsRows } = await pool.query(
        `SELECT followers_count, subscribers_count, posts_count, total_views, total_likes
         FROM author_stats WHERE author_id = $1`,
        [authorId]
      )
      if (statsRows[0]) {
        followersCount = statsRows[0].followers_count ?? 0
        subscribersCount = statsRows[0].subscribers_count ?? 0
        postsCount = statsRows[0].posts_count ?? 0
        totalViews = statsRows[0].total_views ?? 0
        totalLikes = statsRows[0].total_likes ?? 0
      }
    }

    // Following count: always from author_followers by user_id (same for authors and non-authors)
    const { rows: followingRows } = await pool.query(
      `SELECT COUNT(*)::integer as count FROM author_followers WHERE follower_user_id = $1`,
      [userIdInt]
    )
    const followingCount = followingRows[0]?.count ?? 0

    res.json({
      followers: followersCount,
      subscribers: subscribersCount,
      following: followingCount,
      posts: postsCount,
      views: totalViews,
      likes: totalLikes,
      isFollowing: false,
      isSubscribed: false
    })
  } catch (error) {
    console.error('Error fetching my stats:', error)
    res.status(500).json({ message: 'Failed to fetch stats' })
  }
})

// Get current user's following list (works for both authors and non-authors - uses user_id)
router.get('/authors/me/following', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId || !pool) {
      return res.status(401).json({ message: 'Authentication required' })
    }
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0

    const { rows } = await pool.query(
      `SELECT
         af.author_id,
         ap.id          AS author_profile_id,
         ap.username,
         ap.display_name,
         ap.pen_name,
         ap.profile_image,
         ap.bio,
         af.created_at
       FROM author_followers af
       JOIN author_profiles ap
         ON ap.id = af.author_id
         AND ap.status != 'deleted'
       WHERE af.follower_user_id = $1::integer
       ORDER BY af.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching my following:', error)
    res.status(500).json({ message: 'Failed to fetch following' })
  }
})

// Get author by username or ID
router.get('/authors/:identifier', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const { identifier } = req.params
    const isNumeric = /^\d+$/.test(identifier)
    const usernameClean = identifier.startsWith('@') ? identifier.slice(1) : identifier

    const { rows } = await pool.query(
      `SELECT 
        ap.*,
        u.email as user_email,
        u.name as user_name,
        COALESCE(ast.followers_count, 0) as followers_count,
        COALESCE(ast.subscribers_count, 0) as subscribers_count,
        COALESCE(ast.posts_count, 0) as posts_count,
        COALESCE(ast.total_views, 0) as total_views,
        COALESCE(ast.total_likes, 0) as total_likes
       FROM author_profiles ap
       LEFT JOIN users u ON ap.user_id = u.id
       LEFT JOIN author_stats ast ON ap.id = ast.author_id
       WHERE ${isNumeric ? '(ap.id = $1::integer OR ap.user_id = $1::integer)' : '(ap.username = $1 OR ap.username = $2 OR ap.unique_user_id = $1)'}
         AND ap.status != 'deleted'
       ORDER BY ap.id ASC
       LIMIT 1`,
      isNumeric ? [identifier] : [identifier, usernameClean]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Author not found' })
    }

    res.json(rows[0])
  } catch (error) {
    console.error('Error fetching author:', error)
    res.status(500).json({ message: 'Failed to fetch author' })
  }
})

// Create author profile (user becomes an author)
router.post('/authors/create', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const userId = req.userId
    const { username, display_name, bio, profile_image, cover_image, website, location } = req.body

    if (!username || !display_name) {
      return res.status(400).json({ message: 'Username and display name are required' })
    }

    // Check if user already has an author profile
    const { rows: existingRows } = await pool.query(
      `SELECT id FROM author_profiles WHERE user_id = $1`,
      [userId]
    )

    if (existingRows.length > 0) {
      return res.status(400).json({ message: 'Author profile already exists' })
    }

    // Get user email and unique_user_id for profile identification
    const { rows: userRows } = await pool.query(
      `SELECT email, unique_user_id FROM users WHERE id = $1::integer`,
      [userId]
    )
    const userEmail = userRows[0]?.email || null
    const uniqueUserId = userRows[0]?.unique_user_id || null

    // Create author profile
    const { rows } = await pool.query(
      `INSERT INTO author_profiles (
        user_id, unique_user_id, email, username, display_name, bio, profile_image, cover_image, website, location
       )
       VALUES ($1::integer, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId, uniqueUserId, userEmail, username, display_name, bio, profile_image, cover_image, website, location]
    )

    res.json({
      message: 'Author profile created successfully',
      author: rows[0]
    })
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Username already taken' })
    }
    console.error('Error creating author profile:', error)
    res.status(500).json({ message: 'Failed to create author profile' })
  }
})

// Update author profile
router.patch('/authors/update', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const userId = req.userId
    const updates = req.body

    // Get author profile
    const { rows: authorRows } = await pool.query(
      `SELECT id FROM author_profiles WHERE user_id = $1::integer`,
      [userId]
    )

    if (authorRows.length === 0) {
      return res.status(404).json({ message: 'Author profile not found' })
    }

    const authorId = authorRows[0].id

    // Build dynamic update query
    const allowedFields = ['username', 'display_name', 'pen_name', 'real_name', 'bio', 'profile_image', 'cover_image', 'website', 'location', 'writing_categories', 'writing_languages', 'social_links', 'email_visible']
    const updateFields = []
    const values = []
    let paramCount = 1

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' })
    }

    values.push(authorId)

    const { rows } = await pool.query(
      `UPDATE author_profiles 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    )

    res.json({
      message: 'Author profile updated successfully',
      author: rows[0]
    })
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Username already taken' })
    }
    console.error('Error updating author profile:', error)
    res.status(500).json({ message: 'Failed to update author profile' })
  }
})

// Delete author profile (soft delete with 30-day recovery)
router.delete('/authors/delete', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const userId = req.userId

    const { rows } = await pool.query(
      `UPDATE author_profiles 
       SET status = 'deleted',
           deleted_at = CURRENT_TIMESTAMP,
           recovery_until = CURRENT_TIMESTAMP + INTERVAL '30 days'
       WHERE user_id = $1::integer
       RETURNING id, recovery_until`,
      [userId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Author profile not found' })
    }

    res.json({
      message: 'Author profile deleted. You have 30 days to recover.',
      recoveryUntil: rows[0].recovery_until
    })
  } catch (error) {
    console.error('Error deleting author profile:', error)
    res.status(500).json({ message: 'Failed to delete author profile' })
  }
})

// Restore deleted author profile (within 30 days)
router.post('/authors/restore', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const userId = req.userId

    const { rows } = await pool.query(
      `UPDATE author_profiles 
       SET status = 'active',
           deleted_at = NULL,
           recovery_until = NULL
       WHERE user_id = $1::integer
         AND status = 'deleted'
         AND recovery_until > CURRENT_TIMESTAMP
       RETURNING *`,
      [userId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No deleted profile found or recovery period expired' })
    }

    res.json({
      message: 'Author profile restored successfully',
      author: rows[0]
    })
  } catch (error) {
    console.error('Error restoring author profile:', error)
    res.status(500).json({ message: 'Failed to restore author profile' })
  }
})

// Cleanup expired deleted profiles (run via cron)
router.post('/authors/cleanup-deleted', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    // Permanently delete profiles past recovery period
    const { rows } = await pool.query(
      `DELETE FROM author_profiles 
       WHERE status = 'deleted' 
         AND recovery_until < CURRENT_TIMESTAMP
       RETURNING id`
    )

    res.json({
      message: 'Cleanup completed',
      deletedCount: rows.length
    })
  } catch (error) {
    console.error('Error cleaning up deleted profiles:', error)
    res.status(500).json({ message: 'Failed to cleanup deleted profiles' })
  }
})

function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Server-rendered meta page for author profile sharing (WhatsApp, Facebook, etc.)
// Crawlers don't run JS - they need meta tags in the initial HTML
export async function serveAuthorMetaPage(req: express.Request, res: express.Response) {
  try {
    if (!pool) {
      return res.status(500).send('Server error')
    }
    const identifier = req.params.id
    const isNumeric = /^\d+$/.test(identifier)
    const usernameClean = identifier.startsWith('@') ? identifier.slice(1) : identifier

    const { rows } = await pool.query(
      `SELECT 
        ap.id, ap.username, ap.display_name, ap.bio, ap.profile_image, ap.cover_image, ap.unique_user_id
       FROM author_profiles ap
       WHERE ap.status != 'deleted'
         AND (
           ${isNumeric ? 'ap.id = $1::integer OR ap.user_id = $1::integer' : '(ap.username = $1 OR ap.username = $2 OR ap.unique_user_id = $1)'}
         )`,
      isNumeric ? [identifier] : [identifier, usernameClean]
    )

    if (rows.length === 0) {
      return res.status(404).send('Author not found')
    }

    const author = rows[0]
    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http')
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'thenefol.com'
    const baseUrl = `${protocol}://${host}`
    const toAbsolute = (url: string | null | undefined) => {
      if (!url) return ''
      if (url.startsWith('http')) return url
      return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
    }

    const displayName = author.display_name || author.username || 'Author'
    const username = author.username?.startsWith('@') ? author.username : `@${author.username || ''}`
    const bio = (author.bio || '').replace(/<[^>]*>/g, '').trim().slice(0, 200)
    const ogImage = toAbsolute(author.profile_image || author.cover_image || null)
    const authorId = author.unique_user_id || String(author.id)
    const pageUrl = `${baseUrl}/author/${encodeURIComponent(authorId)}`
    const frontendBase = (process.env.FRONTEND_URL || '').replace(/\/$/, '') || baseUrl
    const spaUrl = `${frontendBase}/#/user/author/${encodeURIComponent(authorId)}`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(displayName)} | NEFOL Author</title>
  <meta name="description" content="${escapeHtml(bio || `${displayName}'s profile on NEFOL`)}">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${escapeHtml(displayName)}">
  <meta property="og:description" content="${escapeHtml(bio || `${displayName}'s profile on NEFOL`)}">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  <meta property="og:site_name" content="The Nefol">
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ''}
  <meta property="og:image:width" content="400">
  <meta property="og:image:height" content="400">
  <meta property="profile:username" content="${escapeHtml(username)}">
  <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${escapeHtml(displayName)}">
  <meta name="twitter:description" content="${escapeHtml(bio || `${displayName}'s profile on NEFOL`)}">
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}">` : ''}
  <link rel="canonical" href="${escapeHtml(pageUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(spaUrl)}">
  <script>window.location.replace(${JSON.stringify(spaUrl)})</script>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(spaUrl)}">${escapeHtml(displayName)}</a>...</p>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (err) {
    console.error('Author meta page error:', err)
    res.status(500).send('Server error')
  }
}

export default router
