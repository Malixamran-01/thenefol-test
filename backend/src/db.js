/**
 * Database connection pool (scripts / legacy CJS entry).
 * Settings mirror `src/config/pgPool.ts` used by `index.ts`.
 */

const { Pool } = require('pg')
require('dotenv').config()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables')
  process.exit(1)
}

const isSupabasePooler = /pooler\.supabase\.com/i.test(connectionString)
const isSupabaseTransactionPooler =
  isSupabasePooler &&
  (/:6543\b/.test(connectionString) || /[?&]pgbouncer=true/i.test(connectionString))
const isSupabaseSessionPooler = isSupabasePooler && !isSupabaseTransactionPooler
const isSupabase =
  connectionString.includes('supabase.co') || isSupabasePooler

const defaultMax = isSupabaseSessionPooler ? 8 : isSupabasePooler ? 10 : 20
const poolerCap = isSupabasePooler ? 15 : 100
const max = Math.min(
  poolerCap,
  Math.max(1, parseInt(process.env.PGPOOL_MAX || String(defaultMax), 10) || defaultMax)
)

const pool = new Pool({
  connectionString,
  max,
  idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10) || 30000,
  connectionTimeoutMillis:
    parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || '5000', 10) || 5000,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
})

pool.on('connect', () => {
  console.log('✅ Database connection established')
})

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err.message)
})

if (isSupabaseSessionPooler) {
  console.warn(
    '[DB] Session pooler URL — switch to transaction pooler (port 6543) to avoid max client errors.'
  )
}

module.exports = pool
