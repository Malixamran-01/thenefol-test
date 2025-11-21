// Script to initialize user tracking tables
require('dotenv').config()
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol'
const pool = new Pool({ connectionString })

async function initializeTables() {
  console.log('🚀 Initializing user tracking tables...')
  
  try {
    // Create user_activities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        activity_type VARCHAR(50) NOT NULL,
        activity_subtype VARCHAR(50),
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
    `)
    console.log('✅ user_activities table created')

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_activities_session ON user_activities(session_id)`)
    console.log('✅ user_activities indexes created')

    // Create user_sessions table
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
    `)
    console.log('✅ user_sessions table created')

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id)`)
    console.log('✅ user_sessions indexes created')

    // Create user_stats table
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
        average_session_duration INTEGER,
        last_seen TIMESTAMP,
        last_order_date TIMESTAMP,
        last_page_viewed TEXT,
        lifetime_value DECIMAL(10, 2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ user_stats table created')

    // Create user_preferences table
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
    `)
    console.log('✅ user_preferences table created')

    // Create user_addresses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        address_type VARCHAR(20) NOT NULL,
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
    `)
    console.log('✅ user_addresses table created')

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id)`)
    console.log('✅ user_addresses indexes created')

    // Create user_notes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        note TEXT NOT NULL,
        note_type VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ user_notes table created')

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id)`)
    console.log('✅ user_notes indexes created')

    // Create user_tags table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_tags (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tag VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, tag)
      )
    `)
    console.log('✅ user_tags table created')

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_tags_tag ON user_tags(tag)`)
    console.log('✅ user_tags indexes created')

    console.log('🎉 All user tracking tables initialized successfully!')
    
  } catch (error) {
    console.error('❌ Error initializing tables:', error)
    throw error
  } finally {
    await pool.end()
  }
}

initializeTables()
  .then(() => {
    console.log('✅ Database initialization complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  })

