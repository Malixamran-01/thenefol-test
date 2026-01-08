/**
 * Create test user and ensure all required tables exist
 */

const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:2015127a@localhost:5432/nefol'
})

async function setupTestUser() {
  console.log('🔧 Setting up test user and tables...\n')
  
  try {
    // Ensure coin_transactions table exists
    console.log('📦 Creating coin_transactions table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coin_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'completed',
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON coin_transactions(type);
      CREATE INDEX IF NOT EXISTS idx_coin_transactions_order_id ON coin_transactions(order_id);
    `)
    console.log('✅ coin_transactions table created\n')
    
    // Ensure order_cancellations table exists
    console.log('📦 Creating order_cancellations table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_cancellations (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        order_number TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        cancellation_reason TEXT,
        cancellation_type VARCHAR(50) DEFAULT 'full',
        refund_amount NUMERIC(12,2),
        refund_status VARCHAR(50) DEFAULT 'pending',
        razorpay_refund_id TEXT,
        refund_id TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        processed_by INTEGER,
        processed_at TIMESTAMPTZ,
        admin_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log('✅ order_cancellations table created\n')
    
    // Ensure admin_notifications table exists
    console.log('📦 Creating admin_notifications table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notification_type VARCHAR(100),
        title TEXT NOT NULL,
        message TEXT,
        link TEXT,
        icon VARCHAR(50),
        priority VARCHAR(20) DEFAULT 'normal',
        metadata JSONB,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log('✅ admin_notifications table created\n')
    
    // Create test user if doesn't exist
    console.log('👤 Creating test user...')
    const bcrypt = require('bcrypt')
    const hashedPassword = await bcrypt.hash('testpassword123', 10)
    
    await pool.query(`
      INSERT INTO users (email, name, password, loyalty_points)
      VALUES ('test@example.com', 'Test User', $1, 0)
      ON CONFLICT (email) DO UPDATE 
      SET loyalty_points = 0
      RETURNING id, email, loyalty_points
    `, [hashedPassword])
    
    console.log('✅ Test user ready: test@example.com\n')
    
    // Check user balance
    const userResult = await pool.query(
      'SELECT id, email, loyalty_points FROM users WHERE email = $1',
      ['test@example.com']
    )
    
    if (userResult.rows.length > 0) {
      console.log('📊 Test User Info:')
      console.log(`   ID: ${userResult.rows[0].id}`)
      console.log(`   Email: ${userResult.rows[0].email}`)
      console.log(`   Coins: ${userResult.rows[0].loyalty_points}\n`)
    }
    
    console.log('✅ Setup complete! Ready for testing.')
    
    await pool.end()
    return true
  } catch (err) {
    console.error('❌ Error:', err.message)
    await pool.end()
    return false
  }
}

setupTestUser().then(success => {
  process.exit(success ? 0 : 1)
})


