const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:2015127a@localhost:5432/nefol'
})

async function fixOrdersTable() {
  console.log('🔧 Adding missing columns to orders table...\n')
  
  try {
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS payment_status TEXT,
      ADD COLUMN IF NOT EXISTS coins_used INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS can_cancel BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS billing_address JSONB,
      ADD COLUMN IF NOT EXISTS discount_code TEXT,
      ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS invoice_number TEXT,
      ADD COLUMN IF NOT EXISTS affiliate_id INTEGER
    `)
    
    console.log('✅ All columns added successfully!\n')
    await pool.end()
  } catch (err) {
    console.error('❌ Error:', err.message)
    await pool.end()
    process.exit(1)
  }
}

fixOrdersTable()


