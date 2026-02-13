import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { Pool } from 'pg'
import { authenticateToken } from '../utils/apiHelpers'

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/blog')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// Database pool (will be injected)
let pool: Pool

// Initialize database connection
export function initBlogRouter(databasePool: Pool) {
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

const cleanupDeletedBlogPosts = async () => {
  if (!pool) return
  const { rows } = await pool.query(
    `SELECT id, cover_image, detail_image, images FROM blog_posts WHERE is_deleted = true AND deleted_at < now() - interval '30 days'`
  )
  for (const row of rows) {
    // Delete cover image
    if (row.cover_image) {
      const coverPath = path.join(__dirname, '../../uploads/blog', path.basename(row.cover_image))
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath)
      }
    }
    
    // Delete detail image
    if (row.detail_image) {
      const detailPath = path.join(__dirname, '../../uploads/blog', path.basename(row.detail_image))
      if (fs.existsSync(detailPath)) {
        fs.unlinkSync(detailPath)
      }
    }
    
    // Delete content images
    if (row.images) {
      try {
        const imageArray = typeof row.images === 'string' ? JSON.parse(row.images) : row.images
        imageArray.forEach((imagePath: string) => {
          const fullPath = path.join(__dirname, '../../uploads/blog', path.basename(imagePath))
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath)
          }
        })
      } catch (e) {
        console.warn('Could not parse images array:', e)
      }
    }
  }
  if (rows.length > 0) {
    await pool.query(`DELETE FROM blog_posts WHERE is_deleted = true AND deleted_at < now() - interval '30 days'`)
  }
}

// Submit blog request
router.post('/request', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'detailImage', maxCount: 1 },
  { name: 'ogImage', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]), async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      author_name,
      author_email,
      meta_title,
      meta_description,
      meta_keywords,
      og_title,
      og_description,
      og_image,
      canonical_url,
      categories,
      allow_comments
    } = req.body
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    
    // Extract different image types
    const coverImageFile = files?.coverImage?.[0]
    const detailImageFile = files?.detailImage?.[0]
    const ogImageFile = files?.ogImage?.[0]
    const contentImages = files?.images || []

    if (!title || !content || !excerpt || !author_name || !author_email) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    if (!coverImageFile) {
      return res.status(400).json({ message: 'Cover image is required' })
    }

    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    // Generate URLs for different image types
    const coverImageUrl = `/uploads/blog/${coverImageFile.filename}`
    const detailImageUrl = detailImageFile ? `/uploads/blog/${detailImageFile.filename}` : null
    const ogImageUrl = ogImageFile
      ? `/uploads/blog/${ogImageFile.filename}`
      : (og_image && String(og_image).trim()) || null
    const contentImageUrls = contentImages.map(img => `/uploads/blog/${img.filename}`)

    // Extract user_id from token if provided (optional authentication)
    const userId = getUserIdFromToken(req)

    const parseStringArray = (value: any): string[] => {
      if (!value) return []
      if (Array.isArray(value)) return value.map(String).filter(Boolean)
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
        } catch {
          return value.split(',').map(item => item.trim()).filter(Boolean)
        }
      }
      return []
    }

    const parsedCategories = parseStringArray(categories)
    const parsedKeywords = parseStringArray(meta_keywords)

    // Insert into database
    const { rows } = await pool.query(`
      INSERT INTO blog_posts (
        title,
        content,
        excerpt,
        author_name,
        author_email,
        cover_image,
        detail_image,
        images,
        status,
        user_id,
        meta_title,
        meta_description,
        meta_keywords,
        og_title,
        og_description,
        og_image,
        canonical_url,
        categories,
        allow_comments,
        is_active,
        is_archived,
        is_deleted,
        deleted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true, false, false, null)
      RETURNING id, created_at
    `, [
      title,
      content,
      excerpt,
      author_name,
      author_email,
      coverImageUrl,
      detailImageUrl,
      JSON.stringify(contentImageUrls),
      userId,
      meta_title || null,
      meta_description || null,
      parsedKeywords.length ? JSON.stringify(parsedKeywords) : null,
      og_title || null,
      og_description || null,
      ogImageUrl || coverImageUrl,
      canonical_url || null,
      parsedCategories.length ? JSON.stringify(parsedCategories) : null,
      String(allow_comments).toLowerCase() === 'false' ? false : true
    ])

    // Send email notification to admin (placeholder)
    console.log(`📧 New blog request from ${author_name}: ${title}`)

    res.json({
      message: 'Blog request submitted successfully',
      requestId: rows[0].id
    })
  } catch (error) {
    console.error('Error submitting blog request:', error)
    res.status(500).json({ message: 'Failed to submit blog request' })
  }
})

// Get all blog posts (approved only for public)
router.get('/posts', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const { rows } = await pool.query(`
      SELECT * FROM blog_posts 
      WHERE status = 'approved' 
        AND is_active = true
        AND is_archived = false
        AND is_deleted = false
      ORDER BY created_at DESC
    `)
    
    res.json(rows)
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    res.status(500).json({ message: 'Failed to fetch blog posts' })
  }
})

// Server-rendered meta page for social crawlers (WhatsApp, Facebook, etc.)
// Crawlers don't run JS - they need meta tags in the initial HTML
export async function serveBlogMetaPage(req: express.Request, res: express.Response) {
  try {
    if (!pool) {
      return res.status(500).send('Server error')
    }
    const id = req.params.id
    const { rows } = await pool.query(`
      SELECT id, title, excerpt, meta_title, meta_description, og_title, og_description, og_image, cover_image, detail_image, canonical_url
      FROM blog_posts
      WHERE id = $1 AND status = 'approved' AND is_active = true AND is_archived = false AND is_deleted = false
    `, [id])
    if (rows.length === 0) {
      return res.status(404).send('Blog post not found')
    }
    const post = rows[0]
    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http')
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'thenefol.com'
    const baseUrl = `${protocol}://${host}`
    const toAbsolute = (url: string | null | undefined) => {
      if (!url) return ''
      if (url.startsWith('http')) return url
      return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
    }
    const ogImage = toAbsolute(post.og_image || post.cover_image || post.detail_image)
    const title = post.og_title || post.meta_title || post.title
    const description = (post.og_description || post.meta_description || post.excerpt || '').replace(/<[^>]*>/g, '').slice(0, 200)
    const pageUrl = post.canonical_url || `${baseUrl}/blog/${id}`
    const spaUrl = `${baseUrl}/#/user/blog/${id}`
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ''}
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}">` : ''}
  <link rel="canonical" href="${escapeHtml(pageUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(spaUrl)}">
  <script>window.location.replace(${JSON.stringify(spaUrl)})</script>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(spaUrl)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (err) {
    console.error('Blog meta page error:', err)
    res.status(500).send('Server error')
  }
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Get single blog post
router.get('/posts/:id', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const { rows } = await pool.query(`
      SELECT * FROM blog_posts 
      WHERE id = $1
        AND status = 'approved'
        AND is_active = true
        AND is_archived = false
        AND is_deleted = false
    `, [req.params.id])
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' })
    }
    
    res.json(rows[0])
  } catch (error) {
    console.error('Error fetching blog post:', error)
    res.status(500).json({ message: 'Failed to fetch blog post' })
  }
})

// Admin routes (protected)
// Get all blog requests (admin only)
router.get('/admin/requests', async (req, res) => {
  try {
    await cleanupDeletedBlogPosts()
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const { rows } = await pool.query(`
      SELECT * FROM blog_posts 
      WHERE status = 'pending' AND is_deleted = false
      ORDER BY created_at DESC
    `)
    
    res.json(rows)
  } catch (error) {
    console.error('Error fetching blog requests:', error)
    res.status(500).json({ message: 'Failed to fetch blog requests' })
  }
})

// Get all blog posts (admin only)
router.get('/admin/posts', async (req, res) => {
  try {
    await cleanupDeletedBlogPosts()
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const { rows } = await pool.query(`
      SELECT * FROM blog_posts 
      WHERE is_deleted = false
      ORDER BY created_at DESC
    `)
    
    res.json(rows)
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    res.status(500).json({ message: 'Failed to fetch blog posts' })
  }
})

// Approve blog request
router.post('/admin/approve/:id', async (req, res) => {
  try {
    const requestId = req.params.id
    const { featured = false } = req.body

    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const { rows } = await pool.query(`
      UPDATE blog_posts 
      SET status = 'approved', featured = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `, [featured, requestId])

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Blog request not found or already processed' })
    }

    // Send email notification to author (placeholder)
    console.log(`📧 Blog post approved for ${rows[0].author_name}: ${rows[0].title}`)

    res.json({
      message: 'Blog request approved successfully',
      post: rows[0]
    })
  } catch (error) {
    console.error('Error approving blog request:', error)
    res.status(500).json({ message: 'Failed to approve blog request' })
  }
})

// Reject blog request
router.post('/admin/reject/:id', async (req, res) => {
  try {
    const requestId = req.params.id
    const { reason } = req.body

    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const { rows } = await pool.query(`
      UPDATE blog_posts 
      SET status = 'rejected', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `, [reason, requestId])

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Blog request not found or already processed' })
    }

    // Send email notification to author (placeholder)
    console.log(`📧 Blog post rejected for ${rows[0].author_name}: ${rows[0].title}. Reason: ${reason}`)

    res.json({
      message: 'Blog request rejected successfully'
    })
  } catch (error) {
    console.error('Error rejecting blog request:', error)
    res.status(500).json({ message: 'Failed to reject blog request' })
  }
})

// Update blog post
router.put('/admin/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id
    const updates = req.body

    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    // Build dynamic update query
    const updateFields = []
    const values = []
    let paramCount = 1

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(postId)

    const { rows } = await pool.query(`
      UPDATE blog_posts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values)

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' })
    }

    res.json({
      message: 'Blog post updated successfully',
      post: rows[0]
    })
  } catch (error) {
    console.error('Error updating blog post:', error)
    res.status(500).json({ message: 'Failed to update blog post' })
  }
})

// Soft delete blog post (recycle bin)
router.delete('/admin/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id

    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const { rows } = await pool.query(
      `UPDATE blog_posts
       SET is_deleted = true, deleted_at = now()
       WHERE id = $1
       RETURNING id`,
      [postId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' })
    }

    res.json({
      message: 'Blog post moved to recycle bin'
    })
  } catch (error) {
    console.error('Error deleting blog post:', error)
    res.status(500).json({ message: 'Failed to delete blog post' })
  }
})

// Restore blog post from recycle bin
router.post('/admin/posts/:id/restore', async (req, res) => {
  try {
    const postId = req.params.id
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const { rows } = await pool.query(
      `UPDATE blog_posts
       SET is_deleted = false, deleted_at = null
       WHERE id = $1
       RETURNING *`,
      [postId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' })
    }

    res.json({ message: 'Blog post restored', post: rows[0] })
  } catch (error) {
    console.error('Error restoring blog post:', error)
    res.status(500).json({ message: 'Failed to restore blog post' })
  }
})

// Toggle post active/archive status
router.post('/admin/posts/:id/status', async (req, res) => {
  try {
    const postId = req.params.id
    const { is_active, is_archived } = req.body
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }

    const { rows } = await pool.query(
      `UPDATE blog_posts
       SET is_active = COALESCE($2, is_active),
           is_archived = COALESCE($3, is_archived),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [postId, is_active, is_archived]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' })
    }

    res.json({ message: 'Blog post status updated', post: rows[0] })
  } catch (error) {
    console.error('Error updating blog post status:', error)
    res.status(500).json({ message: 'Failed to update blog post status' })
  }
})

// Likes
router.get('/posts/:id/likes', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    const postId = req.params.id
    const userId = getUserIdFromToken(req)

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM blog_post_likes WHERE post_id = $1`,
      [postId]
    )
    const { rows: likedRows } = userId
      ? await pool.query(
        `SELECT 1 FROM blog_post_likes WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
        [postId, userId]
      )
      : { rows: [] }

    res.json({ count: countRows[0]?.count || 0, liked: likedRows.length > 0 })
  } catch (error) {
    console.error('Error fetching likes:', error)
    res.status(500).json({ message: 'Failed to fetch likes' })
  }
})

router.post('/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    const postId = req.params.id
    const userId = req.userId

    await pool.query(
      `INSERT INTO blog_post_likes (post_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (post_id, user_id) DO NOTHING`,
      [postId, userId]
    )

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM blog_post_likes WHERE post_id = $1`,
      [postId]
    )
    res.json({ count: rows[0]?.count || 0 })
  } catch (error) {
    console.error('Error liking post:', error)
    res.status(500).json({ message: 'Failed to like post' })
  }
})

router.post('/posts/:id/unlike', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    const postId = req.params.id
    const userId = req.userId

    await pool.query(
      `DELETE FROM blog_post_likes WHERE post_id = $1 AND user_id = $2`,
      [postId, userId]
    )

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM blog_post_likes WHERE post_id = $1`,
      [postId]
    )
    res.json({ count: rows[0]?.count || 0 })
  } catch (error) {
    console.error('Error unliking post:', error)
    res.status(500).json({ message: 'Failed to unlike post' })
  }
})

// Comments
router.get('/posts/:id/comments', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    const postId = req.params.id
    const sort = (req.query.sort as string) || 'new'
    const userId = getUserIdFromToken(req)
    const { rows: postRows } = await pool.query(
      `SELECT allow_comments FROM blog_posts WHERE id = $1`,
      [postId]
    )
    if (postRows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' })
    }
    if (postRows[0].allow_comments === false) {
      return res.json([])
    }
    // Build order clause based on sort preference
    // Using ancestors array length for depth ordering
    let orderClause = ''
    if (sort === 'top') {
      orderClause = 'COALESCE(lc.like_count, 0) DESC, array_length(c.ancestors, 1) ASC NULLS FIRST, c.created_at ASC'
    } else {
      // Order by depth first (root comments first), then by creation time
      orderClause = 'array_length(c.ancestors, 1) ASC NULLS FIRST, c.created_at ASC'
    }

    const { rows } = await pool.query(
      `
      SELECT
        c.*,
        COALESCE(lc.like_count, 0) AS like_count,
        CASE WHEN ul.user_id IS NULL THEN false ELSE true END AS liked,
        COALESCE(array_length(c.ancestors, 1), 0) AS depth
      FROM blog_comments c
      LEFT JOIN (
        SELECT comment_id, COUNT(*)::int AS like_count
        FROM blog_comment_likes
        GROUP BY comment_id
      ) lc ON lc.comment_id = c.id
      LEFT JOIN (
        SELECT comment_id, user_id
        FROM blog_comment_likes
        WHERE user_id = $2
      ) ul ON ul.comment_id = c.id
      WHERE c.post_id = $1
        AND c.is_deleted = false
        AND c.is_active = true
        AND c.is_archived = false
      ORDER BY ${orderClause}
      `,
      [postId, userId]
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching comments:', error)
    res.status(500).json({ message: 'Failed to fetch comments' })
  }
})

router.post('/posts/:id/comments', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    const postId = req.params.id
    const userId = req.userId
    const { content, parent_id, author_name, author_email } = req.body

    const { rows: postRows } = await pool.query(
      `SELECT allow_comments FROM blog_posts WHERE id = $1`,
      [postId]
    )
    if (postRows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' })
    }
    if (postRows[0].allow_comments === false) {
      return res.status(403).json({ message: 'Comments are disabled for this post' })
    }

    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: 'Comment content is required' })
    }

    let ancestors: number[] | null = null
    
    if (parent_id) {
      const { rows: parentRows } = await pool.query(
        `SELECT id, ancestors FROM blog_comments WHERE id = $1 AND post_id = $2 AND is_deleted = false`,
        [parent_id, postId]
      )
      if (parentRows.length === 0) {
        return res.status(400).json({ message: 'Invalid parent comment' })
      }
      
      // Build ancestors array: parent's ancestors + parent's id
      const parentAncestors = parentRows[0].ancestors || []
      ancestors = [...parentAncestors, parseInt(parent_id)]
    }

    const { rows } = await pool.query(
      `INSERT INTO blog_comments (post_id, parent_id, ancestors, user_id, author_name, author_email, content)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [postId, parent_id || null, ancestors, userId, author_name || null, author_email || null, content]
    )
    res.json(rows[0])
  } catch (error) {
    console.error('Error creating comment:', error)
    res.status(500).json({ message: 'Failed to create comment' })
  }
})

// Comment like/unlike
router.post('/comments/:id/like', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    const commentId = req.params.id
    const userId = req.userId

    await pool.query(
      `INSERT INTO blog_comment_likes (comment_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (comment_id, user_id) DO NOTHING`,
      [commentId, userId]
    )

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM blog_comment_likes WHERE comment_id = $1`,
      [commentId]
    )
    res.json({ count: rows[0]?.count || 0 })
  } catch (error) {
    console.error('Error liking comment:', error)
    res.status(500).json({ message: 'Failed to like comment' })
  }
})

router.post('/comments/:id/unlike', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    const commentId = req.params.id
    const userId = req.userId

    await pool.query(
      `DELETE FROM blog_comment_likes WHERE comment_id = $1 AND user_id = $2`,
      [commentId, userId]
    )

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM blog_comment_likes WHERE comment_id = $1`,
      [commentId]
    )
    res.json({ count: rows[0]?.count || 0 })
  } catch (error) {
    console.error('Error unliking comment:', error)
    res.status(500).json({ message: 'Failed to unlike comment' })
  }
})

// Update comment (author only)
router.patch('/comments/:id', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    const commentId = req.params.id
    const userId = req.userId
    const { content } = req.body

    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: 'Comment content is required' })
    }

    const { rows } = await pool.query(
      `UPDATE blog_comments
       SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3 AND is_deleted = false
       RETURNING *`,
      [content, commentId, userId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Comment not found or not editable' })
    }

    res.json(rows[0])
  } catch (error) {
    console.error('Error updating comment:', error)
    res.status(500).json({ message: 'Failed to update comment' })
  }
})

// Delete comment (author only, soft delete)
// Uses ancestors column to efficiently delete comment and all its descendants
router.delete('/comments/:id', authenticateToken, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: 'Database not initialized' })
    }
    const commentId = parseInt(req.params.id)
    const userId = req.userId

    // First verify the comment exists and belongs to the user
    const { rows: commentRows } = await pool.query(
      `SELECT id FROM blog_comments 
       WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
      [commentId, userId]
    )

    if (commentRows.length === 0) {
      return res.status(404).json({ message: 'Comment not found or not deletable' })
    }

    // Delete the comment and all its descendants using ancestors array
    // This is much more efficient than recursive queries
    const { rows } = await pool.query(
      `UPDATE blog_comments
       SET is_deleted = true, deleted_at = now()
       WHERE (id = $1 OR $1 = ANY(ancestors))
         AND is_deleted = false
       RETURNING id`,
      [commentId]
    )

    res.json({ 
      message: 'Comment and all replies deleted',
      deletedCount: rows.length 
    })
  } catch (error) {
    console.error('Error deleting comment:', error)
    res.status(500).json({ message: 'Failed to delete comment' })
  }
})

export default router
