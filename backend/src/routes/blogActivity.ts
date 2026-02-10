import express from 'express'
import { Pool } from 'pg'
import { authenticateToken } from '../utils/apiHelpers'

const router = express.Router()
let pool: Pool

export function initBlogActivityRouter(databasePool: Pool) {
  pool = databasePool
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

// Follow/Unfollow author
router.post('/authors/:authorId/follow', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const { authorId } = req.params
    const userId = req.userId

    // Check if author exists and is active
    const { rows: authorRows } = await pool.query(
      `SELECT id FROM author_profiles WHERE id = $1 AND status = 'active'`,
      [authorId]
    )

    if (authorRows.length === 0) {
      return res.status(404).json({ message: 'Author not found or inactive' })
    }

    // Check if trying to follow self
    const { rows: selfCheck } = await pool.query(
      `SELECT 1 FROM author_profiles WHERE id = $1 AND user_id = $2::integer`,
      [authorId, userId]
    )

    if (selfCheck.length > 0) {
      return res.status(400).json({ message: 'Cannot follow yourself' })
    }

    // Add follower
    await pool.query(
      `INSERT INTO author_followers (author_id, follower_user_id, created_at)
       VALUES ($1, $2::integer, CURRENT_TIMESTAMP)
       ON CONFLICT (author_id, follower_user_id) DO NOTHING`,
      [authorId, userId]
    )

    // Log activity
    await pool.query(
      `INSERT INTO blog_activities (user_id, author_id, activity_type, created_at)
       VALUES ($1::integer, $2, 'follow', CURRENT_TIMESTAMP)`,
      [userId, authorId]
    )

    // Get updated count from cached stats
    const { rows } = await pool.query(
      `SELECT followers_count FROM author_stats WHERE author_id = $1`,
      [authorId]
    )

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
    const userId = req.userId

    await pool.query(
      `DELETE FROM author_followers WHERE author_id = $1 AND follower_user_id = $2::integer`,
      [authorId, userId]
    )

    // Get updated count from cached stats
    const { rows } = await pool.query(
      `SELECT followers_count FROM author_stats WHERE author_id = $1`,
      [authorId]
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

    // Check if author exists and is active
    const { rows: authorRows } = await pool.query(
      `SELECT id FROM author_profiles WHERE id = $1 AND status = 'active'`,
      [authorId]
    )

    if (authorRows.length === 0) {
      return res.status(404).json({ message: 'Author not found or inactive' })
    }

    // Check if trying to subscribe to self
    const { rows: selfCheck } = await pool.query(
      `SELECT 1 FROM author_profiles WHERE id = $1 AND user_id = $2::integer`,
      [authorId, userId]
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
      [authorId, userId, email]
    )

    // Get updated count from cached stats
    const { rows } = await pool.query(
      `SELECT subscribers_count FROM author_stats WHERE author_id = $1`,
      [authorId]
    )

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
    const userId = req.userId

    // Soft cancel subscription (don't delete, just mark cancelled)
    await pool.query(
      `UPDATE author_subscriptions 
       SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
       WHERE author_id = $1 AND user_id = $2::integer`,
      [authorId, userId]
    )

    // Get updated count from cached stats
    const { rows } = await pool.query(
      `SELECT subscribers_count FROM author_stats WHERE author_id = $1`,
      [authorId]
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

// Get author stats (followers, subscribers)
router.get('/authors/:authorId/stats', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const { authorId } = req.params
    const userId = getUserIdFromToken(req)

    // Get cached stats
    const { rows: statsRows } = await pool.query(
      `SELECT followers_count, subscribers_count, posts_count, total_views, total_likes
       FROM author_stats WHERE author_id = $1`,
      [authorId]
    )

    let isFollowing = false
    let isSubscribed = false

    if (userId) {
      const { rows: followingRows } = await pool.query(
        `SELECT 1 FROM author_followers WHERE author_id = $1 AND follower_user_id = $2::integer LIMIT 1`,
        [authorId, userId]
      )
      isFollowing = followingRows.length > 0

      const { rows: subscribedRows } = await pool.query(
        `SELECT 1 FROM author_subscriptions 
         WHERE author_id = $1 AND user_id = $2::integer AND status = 'active' LIMIT 1`,
        [authorId, userId]
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

    // Get author's user_id from author_profiles
    const { rows: authorRows } = await pool.query(
      `SELECT user_id FROM author_profiles WHERE id = $1 AND status = 'active'`,
      [authorId]
    )

    if (authorRows.length === 0) {
      return res.status(404).json({ message: 'Author not found' })
    }

    const userIdOfAuthor = String(authorRows[0].user_id)

    // Get author's liked posts
    const { rows: likedPosts } = await pool.query(
      `SELECT 
        'liked_post' as activity_type,
        bp.id as post_id,
        bp.title as post_title,
        bp.excerpt as post_excerpt,
        bp.cover_image,
        bp.author_name as post_author_name,
        bp.author_email as post_author_email,
        ap.id as post_author_id,
        bpl.created_at as activity_date
       FROM blog_post_likes bpl
       JOIN blog_posts bp ON bpl.post_id = bp.id::text
       LEFT JOIN author_profiles ap ON bp.author_id = ap.id
       WHERE bpl.user_id = $1 
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
        bp.id as post_id,
        bp.title as post_title,
        bp.excerpt as post_excerpt,
        bp.cover_image,
        bp.author_name as post_author_name,
        bp.author_email as post_author_email,
        ap.id as post_author_id,
        bc.content as comment_content,
        bc.created_at as activity_date
       FROM blog_comments bc
       JOIN blog_posts bp ON bc.post_id = bp.id::text
       LEFT JOIN author_profiles ap ON bp.author_id = ap.id
       WHERE bc.user_id = $1 
         AND bc.is_deleted = false
         AND bp.status = 'approved'
         AND bp.is_active = true
         AND bp.is_deleted = false
       ORDER BY bp.id, bc.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userIdOfAuthor, limit, offset]
    )

    // Get author's published posts
    const { rows: publishedPosts } = await pool.query(
      `SELECT 
        'published_post' as activity_type,
        bp.id as post_id,
        bp.title as post_title,
        bp.excerpt as post_excerpt,
        bp.cover_image,
        bp.author_name as post_author_name,
        bp.author_email as post_author_email,
        bp.author_id as post_author_id,
        bp.created_at as activity_date
       FROM blog_posts bp
       WHERE bp.author_id = $1 
         AND bp.status = 'approved'
         AND bp.is_active = true
         AND bp.is_deleted = false
       ORDER BY bp.created_at DESC
       LIMIT $2 OFFSET $3`,
      [authorId, limit, offset]
    )

    // Combine all activities and sort by date
    const allActivities = [
      ...likedPosts,
      ...commentedPosts,
      ...publishedPosts
    ].sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime())
      .slice(0, limit)

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

// Get author by username or ID
router.get('/authors/:identifier', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    
    const { identifier } = req.params
    const isNumeric = /^\d+$/.test(identifier)

    const { rows } = await pool.query(
      `SELECT 
        ap.*,
        u.email as user_email,
        COALESCE(ast.followers_count, 0) as followers_count,
        COALESCE(ast.subscribers_count, 0) as subscribers_count,
        COALESCE(ast.posts_count, 0) as posts_count,
        COALESCE(ast.total_views, 0) as total_views,
        COALESCE(ast.total_likes, 0) as total_likes
       FROM author_profiles ap
       LEFT JOIN users u ON ap.user_id = u.id
       LEFT JOIN author_stats ast ON ap.id = ast.author_id
       WHERE ${isNumeric ? 'ap.id = $1' : 'ap.username = $1'}
         AND ap.status != 'deleted'`,
      [identifier]
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

    // Create author profile
    const { rows } = await pool.query(
      `INSERT INTO author_profiles (
        user_id, username, display_name, bio, profile_image, cover_image, website, location
       )
       VALUES ($1::integer, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, username, display_name, bio, profile_image, cover_image, website, location]
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
    const allowedFields = ['username', 'display_name', 'bio', 'profile_image', 'cover_image', 'website', 'location']
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

export default router
