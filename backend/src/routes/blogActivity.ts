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

    if (userId === authorId) {
      return res.status(400).json({ message: 'Cannot follow yourself' })
    }

    await pool.query(
      `INSERT INTO blog_author_followers (author_id, follower_id, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (author_id, follower_id) DO NOTHING`,
      [authorId, userId]
    )

    // Create activity entry
    await pool.query(
      `INSERT INTO blog_activities (user_id, activity_type, created_at)
       VALUES ($1, 'follow', CURRENT_TIMESTAMP)`,
      [userId]
    )

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM blog_author_followers WHERE author_id = $1`,
      [authorId]
    )

    res.json({ 
      message: 'Author followed successfully',
      followerCount: rows[0]?.count || 0 
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
      `DELETE FROM blog_author_followers WHERE author_id = $1 AND follower_id = $2`,
      [authorId, userId]
    )

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM blog_author_followers WHERE author_id = $1`,
      [authorId]
    )

    res.json({ 
      message: 'Author unfollowed successfully',
      followerCount: rows[0]?.count || 0 
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

    if (userId === authorId) {
      return res.status(400).json({ message: 'Cannot subscribe to yourself' })
    }

    await pool.query(
      `INSERT INTO blog_author_subscribers (author_id, subscriber_id, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (author_id, subscriber_id) DO NOTHING`,
      [authorId, userId]
    )

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM blog_author_subscribers WHERE author_id = $1`,
      [authorId]
    )

    res.json({ 
      message: 'Subscribed to author successfully',
      subscriberCount: rows[0]?.count || 0 
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

    await pool.query(
      `DELETE FROM blog_author_subscribers WHERE author_id = $1 AND subscriber_id = $2`,
      [authorId, userId]
    )

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM blog_author_subscribers WHERE author_id = $1`,
      [authorId]
    )

    res.json({ 
      message: 'Unsubscribed from author successfully',
      subscriberCount: rows[0]?.count || 0 
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

    const { rows: followerRows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM blog_author_followers WHERE author_id = $1`,
      [authorId]
    )

    const { rows: subscriberRows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM blog_author_subscribers WHERE author_id = $1`,
      [authorId]
    )

    let isFollowing = false
    let isSubscribed = false

    if (userId) {
      const { rows: followingRows } = await pool.query(
        `SELECT 1 FROM blog_author_followers WHERE author_id = $1 AND follower_id = $2 LIMIT 1`,
        [authorId, userId]
      )
      isFollowing = followingRows.length > 0

      const { rows: subscribedRows } = await pool.query(
        `SELECT 1 FROM blog_author_subscribers WHERE author_id = $1 AND subscriber_id = $2 LIMIT 1`,
        [authorId, userId]
      )
      isSubscribed = subscribedRows.length > 0
    }

    res.json({
      followers: followerRows[0]?.count || 0,
      subscribers: subscriberRows[0]?.count || 0,
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
        bp.user_id as post_author_id,
        bpl.created_at as activity_date
       FROM blog_post_likes bpl
       JOIN blog_posts bp ON bpl.post_id = bp.id
       WHERE bpl.user_id = $1 
         AND bp.status = 'approved'
         AND bp.is_active = true
         AND bp.is_deleted = false
       ORDER BY bpl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [authorId, limit, offset]
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
        bp.user_id as post_author_id,
        bc.content as comment_content,
        bc.created_at as activity_date
       FROM blog_comments bc
       JOIN blog_posts bp ON bc.post_id = bp.id
       WHERE bc.user_id = $1 
         AND bc.is_deleted = false
         AND bp.status = 'approved'
         AND bp.is_active = true
         AND bp.is_deleted = false
       ORDER BY bp.id, bc.created_at DESC
       LIMIT $2 OFFSET $3`,
      [authorId, limit, offset]
    )

    // Get author's published posts
    const { rows: publishedPosts } = await pool.query(
      `SELECT 
        'published_post' as activity_type,
        id as post_id,
        title as post_title,
        excerpt as post_excerpt,
        cover_image,
        author_name as post_author_name,
        author_email as post_author_email,
        user_id as post_author_id,
        created_at as activity_date
       FROM blog_posts
       WHERE user_id = $1 
         AND status = 'approved'
         AND is_active = true
         AND is_deleted = false
       ORDER BY created_at DESC
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

    // Get list of authors the user follows or is subscribed to
    const { rows: followedAuthors } = await pool.query(
      `SELECT DISTINCT author_id 
       FROM (
         SELECT author_id FROM blog_author_followers WHERE follower_id = $1
         UNION
         SELECT author_id FROM blog_author_subscribers WHERE subscriber_id = $1
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
          bp.author_name,
          bp.author_email,
          bp.user_id as author_id,
          bp.created_at as activity_date,
          COUNT(bpl.id)::int as like_count,
          COUNT(bc.id)::int as comment_count
         FROM blog_posts bp
         LEFT JOIN blog_post_likes bpl ON bp.id = bpl.post_id
         LEFT JOIN blog_comments bc ON bp.id = bc.post_id AND bc.is_deleted = false
         WHERE bp.status = 'approved'
           AND bp.is_active = true
           AND bp.is_deleted = false
         GROUP BY bp.id
         ORDER BY like_count DESC, comment_count DESC, bp.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      )
      return res.json(popularPosts)
    }

    const authorIds = followedAuthors.map(row => row.author_id)

    // Get activities from followed authors
    const { rows: feedActivities } = await pool.query(
      `
      WITH author_likes AS (
        SELECT 
          'author_liked' as activity_type,
          bpl.user_id as actor_id,
          u.name as actor_name,
          u.email as actor_email,
          bp.id as post_id,
          bp.title as post_title,
          bp.excerpt as post_excerpt,
          bp.cover_image,
          bp.author_name as post_author_name,
          bp.user_id as post_author_id,
          bpl.created_at as activity_date
        FROM blog_post_likes bpl
        JOIN blog_posts bp ON bpl.post_id = bp.id
        LEFT JOIN users u ON u.id::text = bpl.user_id
        WHERE bpl.user_id = ANY($1)
          AND bp.status = 'approved'
          AND bp.is_active = true
          AND bp.is_deleted = false
      ),
      author_comments AS (
        SELECT 
          'author_commented' as activity_type,
          bc.user_id as actor_id,
          u.name as actor_name,
          u.email as actor_email,
          bp.id as post_id,
          bp.title as post_title,
          bp.excerpt as post_excerpt,
          bp.cover_image,
          bp.author_name as post_author_name,
          bp.user_id as post_author_id,
          bc.content as comment_content,
          bc.created_at as activity_date
        FROM blog_comments bc
        JOIN blog_posts bp ON bc.post_id = bp.id
        LEFT JOIN users u ON u.id::text = bc.user_id
        WHERE bc.user_id = ANY($1)
          AND bc.is_deleted = false
          AND bp.status = 'approved'
          AND bp.is_active = true
          AND bp.is_deleted = false
      ),
      author_posts AS (
        SELECT 
          'author_published' as activity_type,
          bp.user_id as actor_id,
          bp.author_name as actor_name,
          bp.author_email as actor_email,
          bp.id as post_id,
          bp.title as post_title,
          bp.excerpt as post_excerpt,
          bp.cover_image,
          bp.author_name as post_author_name,
          bp.user_id as post_author_id,
          bp.created_at as activity_date
        FROM blog_posts bp
        WHERE bp.user_id = ANY($1)
          AND bp.status = 'approved'
          AND bp.is_active = true
          AND bp.is_deleted = false
      )
      SELECT * FROM (
        SELECT * FROM author_likes
        UNION ALL
        SELECT actor_id, actor_name, actor_email, post_id, post_title, post_excerpt, 
               cover_image, post_author_name, post_author_id, NULL as comment_content, activity_date, activity_type
        FROM author_comments
        UNION ALL
        SELECT actor_id, actor_name, actor_email, post_id, post_title, post_excerpt,
               cover_image, post_author_name, post_author_id, NULL as comment_content, activity_date, activity_type
        FROM author_posts
      ) combined
      ORDER BY activity_date DESC
      LIMIT $2 OFFSET $3
      `,
      [authorIds, limit, offset]
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

    // Find authors user is not following yet, with most followers/engagement
    const { rows } = await pool.query(
      `SELECT 
        bp.user_id as author_id,
        bp.author_name,
        bp.author_email,
        COUNT(DISTINCT bp.id)::int as post_count,
        COUNT(DISTINCT bpl.id)::int as total_likes,
        COUNT(DISTINCT bc.id)::int as total_comments,
        COUNT(DISTINCT baf.follower_id)::int as follower_count
       FROM blog_posts bp
       LEFT JOIN blog_post_likes bpl ON bp.id = bpl.post_id
       LEFT JOIN blog_comments bc ON bp.id = bc.post_id AND bc.is_deleted = false
       LEFT JOIN blog_author_followers baf ON bp.user_id = baf.author_id
       WHERE bp.status = 'approved'
         AND bp.is_active = true
         AND bp.is_deleted = false
         AND bp.user_id != $1
         AND bp.user_id NOT IN (
           SELECT author_id FROM blog_author_followers WHERE follower_id = $1
         )
       GROUP BY bp.user_id, bp.author_name, bp.author_email
       ORDER BY follower_count DESC, total_likes DESC, post_count DESC
       LIMIT $2`,
      [userId, limit]
    )

    res.json(rows)
  } catch (error) {
    console.error('Error fetching author suggestions:', error)
    res.status(500).json({ message: 'Failed to fetch author suggestions' })
  }
})

export default router
