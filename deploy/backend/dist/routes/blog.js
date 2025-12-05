"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initBlogRouter = initBlogRouter;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const router = express_1.default.Router();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/blog');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${(0, uuid_1.v4)()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
// Database pool (will be injected)
let pool;
// Initialize database connection
function initBlogRouter(databasePool) {
    pool = databasePool;
}
// Submit blog request
router.post('/request', upload.array('images', 5), async (req, res) => {
    try {
        const { title, content, excerpt, author_name, author_email } = req.body;
        const images = req.files;
        if (!title || !content || !excerpt || !author_name || !author_email) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (!pool) {
            return res.status(500).json({ message: 'Database not initialized' });
        }
        const imageUrls = images.map(img => `/uploads/blog/${img.filename}`);
        // Insert into database
        const { rows } = await pool.query(`
      INSERT INTO blog_posts (title, content, excerpt, author_name, author_email, images, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id, created_at
    `, [title, content, excerpt, author_name, author_email, JSON.stringify(imageUrls)]);
        // Send email notification to admin (placeholder)
        console.log(`📧 New blog request from ${author_name}: ${title}`);
        res.json({
            message: 'Blog request submitted successfully',
            requestId: rows[0].id
        });
    }
    catch (error) {
        console.error('Error submitting blog request:', error);
        res.status(500).json({ message: 'Failed to submit blog request' });
    }
});
// Get all blog posts (approved only for public)
router.get('/posts', async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ message: 'Database not initialized' });
        }
        const { rows } = await pool.query(`
      SELECT * FROM blog_posts 
      WHERE status = 'approved' 
      ORDER BY created_at DESC
    `);
        res.json(rows);
    }
    catch (error) {
        console.error('Error fetching blog posts:', error);
        res.status(500).json({ message: 'Failed to fetch blog posts' });
    }
});
// Get single blog post
router.get('/posts/:id', async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ message: 'Database not initialized' });
        }
        const { rows } = await pool.query(`
      SELECT * FROM blog_posts 
      WHERE id = $1 AND status = 'approved'
    `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        res.json(rows[0]);
    }
    catch (error) {
        console.error('Error fetching blog post:', error);
        res.status(500).json({ message: 'Failed to fetch blog post' });
    }
});
// Admin routes (protected)
// Get all blog requests (admin only)
router.get('/admin/requests', async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ message: 'Database not initialized' });
        }
        const { rows } = await pool.query(`
      SELECT * FROM blog_posts 
      WHERE status = 'pending' 
      ORDER BY created_at DESC
    `);
        res.json(rows);
    }
    catch (error) {
        console.error('Error fetching blog requests:', error);
        res.status(500).json({ message: 'Failed to fetch blog requests' });
    }
});
// Get all blog posts (admin only)
router.get('/admin/posts', async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ message: 'Database not initialized' });
        }
        const { rows } = await pool.query(`
      SELECT * FROM blog_posts 
      ORDER BY created_at DESC
    `);
        res.json(rows);
    }
    catch (error) {
        console.error('Error fetching blog posts:', error);
        res.status(500).json({ message: 'Failed to fetch blog posts' });
    }
});
// Approve blog request
router.post('/admin/approve/:id', async (req, res) => {
    try {
        const requestId = req.params.id;
        const { featured = false } = req.body;
        if (!pool) {
            return res.status(500).json({ message: 'Database not initialized' });
        }
        const { rows } = await pool.query(`
      UPDATE blog_posts 
      SET status = 'approved', featured = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `, [featured, requestId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Blog request not found or already processed' });
        }
        // Send email notification to author (placeholder)
        console.log(`📧 Blog post approved for ${rows[0].author_name}: ${rows[0].title}`);
        res.json({
            message: 'Blog request approved successfully',
            post: rows[0]
        });
    }
    catch (error) {
        console.error('Error approving blog request:', error);
        res.status(500).json({ message: 'Failed to approve blog request' });
    }
});
// Reject blog request
router.post('/admin/reject/:id', async (req, res) => {
    try {
        const requestId = req.params.id;
        const { reason } = req.body;
        if (!pool) {
            return res.status(500).json({ message: 'Database not initialized' });
        }
        const { rows } = await pool.query(`
      UPDATE blog_posts 
      SET status = 'rejected', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `, [reason, requestId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Blog request not found or already processed' });
        }
        // Send email notification to author (placeholder)
        console.log(`📧 Blog post rejected for ${rows[0].author_name}: ${rows[0].title}. Reason: ${reason}`);
        res.json({
            message: 'Blog request rejected successfully'
        });
    }
    catch (error) {
        console.error('Error rejecting blog request:', error);
        res.status(500).json({ message: 'Failed to reject blog request' });
    }
});
// Update blog post
router.put('/admin/posts/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        const updates = req.body;
        if (!pool) {
            return res.status(500).json({ message: 'Database not initialized' });
        }
        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id' && value !== undefined) {
                updateFields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }
        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(postId);
        const { rows } = await pool.query(`
      UPDATE blog_posts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        res.json({
            message: 'Blog post updated successfully',
            post: rows[0]
        });
    }
    catch (error) {
        console.error('Error updating blog post:', error);
        res.status(500).json({ message: 'Failed to update blog post' });
    }
});
// Delete blog post
router.delete('/admin/posts/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        if (!pool) {
            return res.status(500).json({ message: 'Database not initialized' });
        }
        // Get post info before deleting
        const { rows: postRows } = await pool.query(`
      SELECT images FROM blog_posts WHERE id = $1
    `, [postId]);
        if (postRows.length === 0) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        const post = postRows[0];
        // Delete associated images
        if (post.images) {
            try {
                const imageArray = JSON.parse(post.images);
                imageArray.forEach((imagePath) => {
                    const fullPath = path_1.default.join(__dirname, '../../uploads/blog', path_1.default.basename(imagePath));
                    if (fs_1.default.existsSync(fullPath)) {
                        fs_1.default.unlinkSync(fullPath);
                    }
                });
            }
            catch (e) {
                console.warn('Could not parse images array:', e);
            }
        }
        // Delete from database
        await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
        res.json({
            message: 'Blog post deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting blog post:', error);
        res.status(500).json({ message: 'Failed to delete blog post' });
    }
});
exports.default = router;
