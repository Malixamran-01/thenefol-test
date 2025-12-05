"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = getAllUsers;
exports.getUserDetails = getUserDetails;
exports.getUserActivityTimeline = getUserActivityTimeline;
exports.addUserNote = addUserNote;
exports.addUserTag = addUserTag;
exports.removeUserTag = removeUserTag;
exports.searchUsers = searchUsers;
exports.trackPageView = trackPageView;
exports.trackFormSubmission = trackFormSubmission;
exports.trackCartEvent = trackCartEvent;
exports.getUserSegments = getUserSegments;
const userActivitySchema_1 = require("../utils/userActivitySchema");
// Get all users with summary stats
async function getAllUsers(pool, req, res) {
    try {
        // Check if user_stats table exists, if not, use simpler query
        const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_stats'
      )
    `);
        const hasUserStats = tableCheck.rows[0].exists;
        let query = '';
        if (hasUserStats) {
            query = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.phone,
          u.is_verified,
          u.created_at as member_since,
          COALESCE(u.loyalty_points, 0) as loyalty_points,
          COALESCE(
            (SELECT COUNT(*) FROM orders WHERE customer_email = u.email),
            0
          ) as total_orders,
          COALESCE(
            (SELECT SUM(total) FROM orders WHERE customer_email = u.email),
            0
          ) as total_spent,
          us.last_seen,
          us.total_page_views,
          us.total_sessions
        FROM users u
        LEFT JOIN user_stats us ON u.id = us.user_id
        ORDER BY u.created_at DESC
      `;
        }
        else {
            query = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.phone,
          u.is_verified,
          u.created_at as member_since,
          COALESCE(u.loyalty_points, 0) as loyalty_points,
          COALESCE(
            (SELECT COUNT(*) FROM orders WHERE customer_email = u.email),
            0
          ) as total_orders,
          COALESCE(
            (SELECT SUM(total) FROM orders WHERE customer_email = u.email),
            0
          ) as total_spent,
          NULL as last_seen,
          0 as total_page_views,
          0 as total_sessions
        FROM users u
        ORDER BY u.created_at DESC
      `;
        }
        const result = await pool.query(query);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
}
// Get detailed user profile with all activities
async function getUserDetails(pool, req, res) {
    try {
        const userId = parseInt(req.params.id);
        // Get user basic info
        const userResult = await pool.query(`
      SELECT 
        u.*,
        up.email_notifications,
        up.sms_notifications,
        up.push_notifications,
        up.marketing_emails,
        up.theme,
        up.language,
        up.currency
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        // Get user stats (with fallback calculation)
        let statsResult;
        try {
            statsResult = await pool.query(`
        SELECT * FROM user_stats WHERE user_id = $1
      `, [userId]);
            // If no stats record, create one with current order data
            if (statsResult.rows.length === 0) {
                const orderStats = await pool.query(`
          SELECT 
            COUNT(*) as total_orders,
            COALESCE(SUM(total), 0) as total_spent
          FROM orders
          WHERE customer_email = $1
        `, [user.email]);
                statsResult = {
                    rows: [{
                            user_id: userId,
                            total_page_views: 0,
                            total_sessions: 0,
                            total_orders: parseInt(orderStats.rows[0].total_orders) || 0,
                            total_spent: parseFloat(orderStats.rows[0].total_spent) || 0,
                            total_cart_additions: 0,
                            total_cart_removals: 0,
                            total_form_submissions: 0,
                            average_session_duration: null,
                            last_seen: null,
                            last_order_date: null,
                            last_page_viewed: null,
                            lifetime_value: parseFloat(orderStats.rows[0].total_spent) || 0,
                            updated_at: new Date()
                        }]
                };
            }
        }
        catch (err) {
            console.error('Error fetching user stats:', err);
            statsResult = { rows: [] };
        }
        // Get user addresses
        const addressesResult = await pool.query(`
      SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC
    `, [userId]);
        // Get user orders - user_id is stored in items JSONB array
        let ordersResult = { rows: [] };
        try {
            // First, get user email
            const userEmailResult = await pool.query(`
        SELECT email FROM users WHERE id = $1
      `, [userId]);
            if (userEmailResult.rows.length > 0) {
                const userEmail = userEmailResult.rows[0].email;
                // Try multiple approaches to find orders
                // 1. Check by customer_email
                const ordersByEmail = await pool.query(`
          SELECT 
            o.*,
            o.items as items
          FROM orders o
          WHERE o.customer_email = $1
          ORDER BY o.created_at DESC
          LIMIT 50
        `, [userEmail]);
                if (ordersByEmail.rows.length > 0) {
                    ordersResult = ordersByEmail;
                }
                else {
                    // 2. Check by user_id in items JSONB array
                    const ordersByUserId = await pool.query(`
            SELECT 
              o.*,
              o.items as items
            FROM orders o
            WHERE EXISTS (
              SELECT 1 
              FROM jsonb_array_elements(o.items) as item
              WHERE (item->>'user_id')::int = $1
            )
            ORDER BY o.created_at DESC
            LIMIT 50
          `, [userId]);
                    ordersResult = ordersByUserId;
                }
            }
        }
        catch (err) {
            console.error('Error fetching orders:', err);
            ordersResult = { rows: [] };
        }
        // Get user activity timeline (last 100 activities)
        let activitiesResult;
        try {
            activitiesResult = await pool.query(`
        SELECT * FROM user_activities 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 100
      `, [userId]);
        }
        catch (err) {
            console.error('Error fetching activities:', err);
            activitiesResult = { rows: [] };
        }
        // Get user sessions (last 20 sessions)
        let sessionsResult;
        try {
            sessionsResult = await pool.query(`
        SELECT * FROM user_sessions 
        WHERE user_id = $1 
        ORDER BY started_at DESC 
        LIMIT 20
      `, [userId]);
        }
        catch (err) {
            console.error('Error fetching sessions:', err);
            sessionsResult = { rows: [] };
        }
        // Get user notes
        let notesResult;
        try {
            notesResult = await pool.query(`
        SELECT 
          un.*,
          u.name as admin_name
        FROM user_notes un
        LEFT JOIN users u ON un.admin_id = u.id
        WHERE un.user_id = $1
        ORDER BY un.created_at DESC
      `, [userId]);
        }
        catch (err) {
            console.error('Error fetching notes:', err);
            notesResult = { rows: [] };
        }
        // Get user tags
        let tagsResult;
        try {
            tagsResult = await pool.query(`
        SELECT tag FROM user_tags WHERE user_id = $1
      `, [userId]);
        }
        catch (err) {
            console.error('Error fetching tags:', err);
            tagsResult = { rows: [] };
        }
        // Get cart items
        let cartResult;
        try {
            cartResult = await pool.query(`
        SELECT 
          c.*,
          p.title as product_name,
          p.price,
          p.list_image as image_url
        FROM cart c
        LEFT JOIN products p ON c.product_id = p.id
        WHERE c.user_id = $1
      `, [userId]);
        }
        catch (err) {
            console.error('Error fetching cart:', err);
            cartResult = { rows: [] };
        }
        // Get wishlist
        let wishlistResult;
        try {
            wishlistResult = await pool.query(`
        SELECT 
          w.*,
          p.title as product_name,
          p.price,
          p.list_image as image_url
        FROM wishlist w
        LEFT JOIN products p ON w.product_id = p.id
        WHERE w.user_id = $1
      `, [userId]);
        }
        catch (err) {
            console.error('Error fetching wishlist:', err);
            wishlistResult = { rows: [] };
        }
        // Activity summary by type
        let activitySummaryResult;
        try {
            activitySummaryResult = await pool.query(`
        SELECT 
          activity_type,
          activity_subtype,
          COUNT(*) as count,
          MAX(created_at) as last_activity
        FROM user_activities
        WHERE user_id = $1
        GROUP BY activity_type, activity_subtype
        ORDER BY count DESC
      `, [userId]);
        }
        catch (err) {
            console.error('Error fetching activity summary:', err);
            activitySummaryResult = { rows: [] };
        }
        // Page views breakdown
        let pageViewsResult;
        try {
            pageViewsResult = await pool.query(`
        SELECT 
          page_url,
          page_title,
          COUNT(*) as view_count,
          MAX(created_at) as last_viewed
        FROM user_activities
        WHERE user_id = $1 AND activity_type = 'page_view'
        GROUP BY page_url, page_title
        ORDER BY view_count DESC
        LIMIT 20
      `, [userId]);
        }
        catch (err) {
            console.error('Error fetching page views:', err);
            pageViewsResult = { rows: [] };
        }
        // Product interactions
        let productInteractionsResult;
        try {
            productInteractionsResult = await pool.query(`
        SELECT 
          product_id,
          product_name,
          activity_type,
          activity_subtype,
          COUNT(*) as interaction_count,
          MAX(created_at) as last_interaction
        FROM user_activities
        WHERE user_id = $1 AND product_id IS NOT NULL
        GROUP BY product_id, product_name, activity_type, activity_subtype
        ORDER BY last_interaction DESC
        LIMIT 20
      `, [userId]);
        }
        catch (err) {
            console.error('Error fetching product interactions:', err);
            productInteractionsResult = { rows: [] };
        }
        // Prepare response
        const response = {
            user,
            stats: statsResult.rows[0] || {},
            addresses: addressesResult.rows,
            orders: ordersResult.rows,
            activities: activitiesResult.rows,
            sessions: sessionsResult.rows,
            notes: notesResult.rows,
            tags: tagsResult.rows.map(t => t.tag),
            cart: cartResult.rows,
            wishlist: wishlistResult.rows,
            activitySummary: activitySummaryResult.rows,
            topPages: pageViewsResult.rows,
            productInteractions: productInteractionsResult.rows
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
}
// Get user activity timeline with pagination
async function getUserActivityTimeline(pool, req, res) {
    try {
        const userId = parseInt(req.params.id);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const activityType = req.query.type;
        let query = `
      SELECT * FROM user_activities 
      WHERE user_id = $1
    `;
        const params = [userId];
        if (activityType) {
            query += ` AND activity_type = $${params.length + 1}`;
            params.push(activityType);
        }
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const result = await pool.query(query, params);
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM user_activities WHERE user_id = $1';
        const countParams = [userId];
        if (activityType) {
            countQuery += ' AND activity_type = $2';
            countParams.push(activityType);
        }
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        res.json({
            activities: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching user activity timeline:', error);
        res.status(500).json({ error: 'Failed to fetch activity timeline' });
    }
}
// Add note to user
async function addUserNote(pool, req, res) {
    try {
        const userId = parseInt(req.params.id);
        const { note, note_type } = req.body;
        const adminId = req.userId; // From auth middleware
        const result = await pool.query(`
      INSERT INTO user_notes (user_id, admin_id, note, note_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, adminId, note, note_type || 'general']);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error adding user note:', error);
        res.status(500).json({ error: 'Failed to add note' });
    }
}
// Add tag to user
async function addUserTag(pool, req, res) {
    try {
        const userId = parseInt(req.params.id);
        const { tag } = req.body;
        await pool.query(`
      INSERT INTO user_tags (user_id, tag)
      VALUES ($1, $2)
      ON CONFLICT (user_id, tag) DO NOTHING
    `, [userId, tag]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error adding user tag:', error);
        res.status(500).json({ error: 'Failed to add tag' });
    }
}
// Remove tag from user
async function removeUserTag(pool, req, res) {
    try {
        const userId = parseInt(req.params.id);
        const { tag } = req.body;
        await pool.query(`
      DELETE FROM user_tags WHERE user_id = $1 AND tag = $2
    `, [userId, tag]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error removing user tag:', error);
        res.status(500).json({ error: 'Failed to remove tag' });
    }
}
// Search users
async function searchUsers(pool, req, res) {
    try {
        const searchTerm = req.query.q;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.is_verified,
        u.created_at as member_since,
        COALESCE(u.loyalty_points, 0) as loyalty_points,
        COALESCE(
          (SELECT COUNT(*) FROM orders WHERE user_id = u.id),
          0
        ) as total_orders,
        us.last_seen
      FROM users u
      LEFT JOIN user_stats us ON u.id = us.user_id
      WHERE 
        u.name ILIKE $1 OR 
        u.email ILIKE $1 OR 
        u.phone ILIKE $1
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3
    `, [`%${searchTerm}%`, limit, offset]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
}
// Track page view
async function trackPageView(pool, req, res) {
    try {
        const { page_url, page_title, session_id, referrer } = req.body;
        const userId = req.userId;
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress;
        await (0, userActivitySchema_1.logUserActivity)(pool, {
            user_id: userId ? parseInt(userId) : null,
            session_id,
            activity_type: 'page_view',
            page_url,
            page_title,
            user_agent: userAgent,
            ip_address: ipAddress,
            referrer
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error tracking page view:', error);
        res.status(500).json({ error: 'Failed to track page view' });
    }
}
// Track form submission
async function trackFormSubmission(pool, req, res) {
    try {
        const { form_type, form_data, page_url } = req.body;
        const userId = req.userId;
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress;
        await (0, userActivitySchema_1.logUserActivity)(pool, {
            user_id: userId ? parseInt(userId) : null,
            activity_type: 'form_submit',
            activity_subtype: form_type,
            form_type,
            form_data,
            page_url,
            user_agent: userAgent,
            ip_address: ipAddress
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error tracking form submission:', error);
        res.status(500).json({ error: 'Failed to track form submission' });
    }
}
// Track cart event
async function trackCartEvent(pool, req, res) {
    try {
        const { action, product_id, product_name, product_price, quantity } = req.body;
        const userId = req.userId;
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress;
        await (0, userActivitySchema_1.logUserActivity)(pool, {
            user_id: userId ? parseInt(userId) : null,
            activity_type: 'cart',
            activity_subtype: action,
            product_id,
            product_name,
            product_price,
            quantity,
            user_agent: userAgent,
            ip_address: ipAddress
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error tracking cart event:', error);
        res.status(500).json({ error: 'Failed to track cart event' });
    }
}
// Get user segments
async function getUserSegments(pool, req, res) {
    try {
        const segments = await pool.query(`
      SELECT 
        'high_value' as segment,
        COUNT(*) as count
      FROM user_stats
      WHERE lifetime_value > 10000
      UNION ALL
      SELECT 
        'active' as segment,
        COUNT(*) as count
      FROM user_stats
      WHERE last_seen > NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 
        'inactive' as segment,
        COUNT(*) as count
      FROM user_stats
      WHERE last_seen < NOW() - INTERVAL '30 days'
      UNION ALL
      SELECT 
        'new' as segment,
        COUNT(*) as count
      FROM users
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
        res.json(segments.rows);
    }
    catch (error) {
        console.error('Error fetching user segments:', error);
        res.status(500).json({ error: 'Failed to fetch segments' });
    }
}
