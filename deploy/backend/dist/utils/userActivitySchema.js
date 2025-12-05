"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserActivityTables = createUserActivityTables;
exports.logUserActivity = logUserActivity;
exports.updateUserStats = updateUserStats;
async function createUserActivityTables(pool) {
    try {
        // User Activity Events Table - Single source of truth for all activities
        await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        activity_type VARCHAR(50) NOT NULL, -- page_view, cart_add, cart_remove, order_placed, form_submit, payment, etc.
        activity_subtype VARCHAR(50), -- login, logout, add_to_cart, remove_from_cart, checkout, etc.
        page_url TEXT,
        page_title VARCHAR(255),
        product_id INTEGER,
        product_name VARCHAR(255),
        product_price DECIMAL(10, 2),
        quantity INTEGER,
        order_id INTEGER,
        form_type VARCHAR(100),
        form_data JSONB,
        payment_amount DECIMAL(10, 2),
        payment_method VARCHAR(50),
        payment_status VARCHAR(50),
        user_agent TEXT,
        ip_address VARCHAR(45),
        referrer TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Create indexes for better performance
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
      CREATE INDEX IF NOT EXISTS idx_user_activities_session ON user_activities(session_id);
    `);
        // User Sessions Table - Track user sessions
        await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_type VARCHAR(50),
        browser VARCHAR(50),
        os VARCHAR(50),
        country VARCHAR(100),
        city VARCHAR(100),
        is_active BOOLEAN DEFAULT true
      )
    `);
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
    `);
        // User Stats Table - Aggregated statistics for quick access
        await pool.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        total_page_views INTEGER DEFAULT 0,
        total_sessions INTEGER DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        total_spent DECIMAL(10, 2) DEFAULT 0,
        total_cart_additions INTEGER DEFAULT 0,
        total_cart_removals INTEGER DEFAULT 0,
        total_form_submissions INTEGER DEFAULT 0,
        average_session_duration INTEGER, -- in seconds
        last_seen TIMESTAMP,
        last_order_date TIMESTAMP,
        last_page_viewed TEXT,
        lifetime_value DECIMAL(10, 2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // User Preferences Table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN DEFAULT true,
        sms_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT true,
        marketing_emails BOOLEAN DEFAULT true,
        theme VARCHAR(20) DEFAULT 'light',
        language VARCHAR(10) DEFAULT 'en',
        currency VARCHAR(10) DEFAULT 'INR',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // User Addresses Table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        address_type VARCHAR(20) NOT NULL, -- shipping, billing, both
        full_name VARCHAR(255),
        phone VARCHAR(20),
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        country VARCHAR(100) DEFAULT 'India',
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
    `);
        // User Notes Table (Admin can add notes about users)
        await pool.query(`
      CREATE TABLE IF NOT EXISTS user_notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        note TEXT NOT NULL,
        note_type VARCHAR(50) DEFAULT 'general', -- general, important, warning, etc.
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
    `);
        // User Tags Table (For segmentation)
        await pool.query(`
      CREATE TABLE IF NOT EXISTS user_tags (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tag VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, tag)
      )
    `);
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_tags_tag ON user_tags(tag);
    `);
        console.log('✅ User activity tracking tables created successfully');
    }
    catch (error) {
        console.error('❌ Error creating user activity tables:', error);
        throw error;
    }
}
// Helper function to log user activity
async function logUserActivity(pool, activity) {
    try {
        await pool.query(`
      INSERT INTO user_activities (
        user_id, session_id, activity_type, activity_subtype,
        page_url, page_title, product_id, product_name, product_price,
        quantity, order_id, form_type, form_data,
        payment_amount, payment_method, payment_status,
        user_agent, ip_address, referrer, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `, [
            activity.user_id || null,
            activity.session_id || null,
            activity.activity_type,
            activity.activity_subtype || null,
            activity.page_url || null,
            activity.page_title || null,
            activity.product_id || null,
            activity.product_name || null,
            activity.product_price || null,
            activity.quantity || null,
            activity.order_id || null,
            activity.form_type || null,
            activity.form_data ? JSON.stringify(activity.form_data) : null,
            activity.payment_amount || null,
            activity.payment_method || null,
            activity.payment_status || null,
            activity.user_agent || null,
            activity.ip_address || null,
            activity.referrer || null,
            activity.metadata ? JSON.stringify(activity.metadata) : null
        ]);
        // Update user stats
        if (activity.user_id) {
            await updateUserStats(pool, activity.user_id);
        }
    }
    catch (error) {
        console.error('Error logging user activity:', error);
    }
}
// Update user statistics
async function updateUserStats(pool, userId) {
    try {
        // Ensure user_stats record exists
        await pool.query(`
      INSERT INTO user_stats (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId]);
        // Update statistics
        await pool.query(`
      UPDATE user_stats SET
        total_page_views = (
          SELECT COUNT(*) FROM user_activities 
          WHERE user_id = $1 AND activity_type = 'page_view'
        ),
        total_cart_additions = (
          SELECT COUNT(*) FROM user_activities 
          WHERE user_id = $1 AND activity_type = 'cart' AND activity_subtype = 'add'
        ),
        total_form_submissions = (
          SELECT COUNT(*) FROM user_activities 
          WHERE user_id = $1 AND activity_type = 'form_submit'
        ),
        last_seen = (
          SELECT MAX(created_at) FROM user_activities WHERE user_id = $1
        ),
        last_page_viewed = (
          SELECT page_url FROM user_activities 
          WHERE user_id = $1 AND activity_type = 'page_view'
          ORDER BY created_at DESC LIMIT 1
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [userId]);
    }
    catch (error) {
        console.error('Error updating user stats:', error);
    }
}
