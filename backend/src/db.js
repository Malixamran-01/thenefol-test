/**
 * Database connection pool
 * Configured for Supabase with SSL support
 */

const { Pool } = require('pg')
require('dotenv').config()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables')
  process.exit(1)
}

// Check if this is a Supabase connection (requires SSL)
const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com')

const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined
})

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connection established')
})

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err)
})

module.exports = pool

